import type { IncomingMessage } from "node:http";

/** Extract a bearer token from the Authorization header or the `?token=` query param. */
export function getRequestToken(req: IncomingMessage, url: URL): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const protocol = req.headers["sec-websocket-protocol"];
  if (typeof protocol === "string") {
    const p = protocol.trim();
    if (p) return p;
  }
  return url.searchParams.get("token") ?? undefined;
}

/** True when no token is configured or the request presents the configured token. */
export function isAuthenticated(req: IncomingMessage, url: URL, token: string | undefined): boolean {
  if (!token) return true;
  return getRequestToken(req, url) === token;
}
