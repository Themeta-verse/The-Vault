import { createHash, randomUUID } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type PortableIdentity = {
  openId: string;
  name: string;
  email: string | null;
  loginMethod: string;
};

type OidcMetadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
};

type OidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
};

function normalizeProvider(value: string) {
  return value.trim().toLowerCase();
}

function createStableIdentity(issuer: string, subject: string) {
  const hash = (value: string) =>
    createHash("sha256").update(value).digest("base64url").slice(0, 24);
  return `oidc_${hash(issuer)}_${hash(subject)}`;
}

function getOidcConfig(): OidcConfig {
  const config = {
    issuer: ENV.oidcIssuer.replace(/\/+$/, ""),
    clientId: ENV.oidcClientId,
    clientSecret: ENV.oidcClientSecret,
    redirectUri: ENV.oidcRedirectUri,
    scopes: ENV.oidcScopes,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`OIDC configuration is incomplete: ${missing.join(", ")}`);
  }
  return config;
}

async function discoverOidc(config: OidcConfig): Promise<OidcMetadata> {
  const response = await fetch(
    `${config.issuer}/.well-known/openid-configuration`
  );
  if (!response.ok) {
    throw new Error(`OIDC discovery failed with status ${response.status}`);
  }
  const metadata = (await response.json()) as Partial<OidcMetadata>;
  if (
    !metadata.authorization_endpoint ||
    !metadata.token_endpoint ||
    !metadata.jwks_uri ||
    !metadata.issuer
  ) {
    throw new Error("OIDC discovery response is incomplete");
  }
  if (metadata.issuer !== config.issuer) {
    throw new Error("OIDC discovery issuer does not match OIDC_ISSUER");
  }
  return metadata as OidcMetadata;
}

async function getOidcAuthorizationUrl(state: string) {
  const config = getOidcConfig();
  const metadata = await discoverOidc(config);
  const url = new URL(metadata.authorization_endpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeOidcCode(code: string): Promise<PortableIdentity> {
  const config = getOidcConfig();
  const metadata = await discoverOidc(config);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });
  const authorization = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");
  const response = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(
      `OIDC token exchange failed with status ${response.status}`
    );
  }
  const token = (await response.json()) as { id_token?: string };
  if (!token.id_token) throw new Error("OIDC token response lacks an ID token");

  const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri));
  const { payload } = await jwtVerify(token.id_token, jwks, {
    issuer: config.issuer,
    audience: config.clientId,
  });
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("OIDC ID token lacks a subject claim");
  }
  const name =
    typeof payload.name === "string"
      ? payload.name
      : typeof payload.preferred_username === "string"
        ? payload.preferred_username
        : "Vault visitor";
  const email = typeof payload.email === "string" ? payload.email : null;
  return {
    openId: createStableIdentity(config.issuer, payload.sub),
    name,
    email,
    loginMethod: "oidc",
  };
}

export const authProvider = {
  usesPortableOidc() {
    return normalizeProvider(ENV.authProvider) === "oidc";
  },

  callbackUri(fallback: string) {
    return this.usesPortableOidc() ? getOidcConfig().redirectUri : fallback;
  },

  async getAuthorizationUrl(state: string) {
    if (this.usesPortableOidc()) return getOidcAuthorizationUrl(state);
    if (!ENV.oAuthPortalUrl || !ENV.appId) {
      throw new Error("Legacy OAuth portal configuration is incomplete");
    }
    const url = new URL("/app-auth", ENV.oAuthPortalUrl);
    url.searchParams.set("appId", ENV.appId);
    url.searchParams.set("redirectUri", "");
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url;
  },

  async exchangeCodeForIdentity(
    code: string,
    state: string
  ): Promise<PortableIdentity> {
    if (this.usesPortableOidc()) return exchangeOidcCode(code);
    const token = await sdk.exchangeCodeForToken(code, state);
    const user = await sdk.getUserInfo(token.accessToken);
    if (!user.openId) throw new Error("Legacy OAuth identity lacks an openId");
    return {
      openId: user.openId,
      name: user.name || "Vault visitor",
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? user.platform ?? "legacy-oauth",
    };
  },

  createLoginState() {
    return randomUUID();
  },
};
