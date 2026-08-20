import {
  COOKIE_NAME,
  ONE_YEAR_MS,
  OAUTH_STATE_COOKIE,
  decodeOAuthState,
  encodeOAuthState,
} from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { authProvider } from "./authProvider";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getRequestOrigin(req: Request) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    typeof forwardedHost === "string"
      ? forwardedHost.split(",")[0].trim()
      : req.get("host");
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol =
    typeof forwardedProto === "string"
      ? forwardedProto.split(",")[0].trim()
      : req.protocol;
  return `${protocol}://${host}`;
}

function safeReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const fallbackCallback = `${getRequestOrigin(req)}/api/oauth/callback`;
      const redirectUri = authProvider.callbackUri(fallbackCallback);
      const nonce = authProvider.createLoginState();
      const state = encodeOAuthState({
        redirectUri,
        nonce,
        returnTo: safeReturnPath(getQueryParam(req, "returnTo")),
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(OAUTH_STATE_COOKIE, nonce, {
        ...cookieOptions,
        sameSite: "lax",
        maxAge: 10 * 60 * 1000,
      });
      const authorizationUrl = await authProvider.getAuthorizationUrl(state);
      if (!authProvider.usesPortableOidc()) {
        const legacyUrl = new URL(authorizationUrl);
        legacyUrl.searchParams.set("redirectUri", redirectUri);
        res.redirect(302, legacyUrl.toString());
        return;
      }
      res.redirect(302, authorizationUrl.toString());
    } catch (error) {
      console.error("[Auth] Login initialization failed", error);
      res.status(503).json({ error: "login is temporarily unavailable" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const decodedState = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[
      OAUTH_STATE_COOKIE
    ];
    if (!decodedState.nonce || decodedState.nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(OAUTH_STATE_COOKIE, cookieOptions);

    try {
      const userInfo = await authProvider.exchangeCodeForIdentity(code, state);
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email,
        loginMethod: userInfo.loginMethod,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name,
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      res.redirect(302, safeReturnPath(decodedState.returnTo));
    } catch (error) {
      console.error("[Auth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
