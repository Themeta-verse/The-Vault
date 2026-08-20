export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start the server-owned OAuth/OIDC login flow. The server creates and binds a
// one-time CSRF state cookie, then chooses the configured provider. Keep this
// call inside an event handler or effect because it navigates immediately.
export const startLogin = () => {
  const url = new URL("/api/auth/login", window.location.origin);
  url.searchParams.set("returnTo", `${window.location.pathname}${window.location.search}`);
  window.location.assign(url.toString());
};
