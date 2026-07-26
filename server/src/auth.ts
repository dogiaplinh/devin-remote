import { randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const COOKIE_NAME = "devin_remote_session";

function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name && value.length > 0) cookies.set(name, decodeURIComponent(value.join("=")));
  }
  return cookies;
}

function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class Auth {
  readonly enabled: boolean;
  readonly username: string;
  private readonly password: string;
  private readonly sessions = new Set<string>();

  constructor() {
    this.username = process.env.DEVIN_REMOTE_AUTH_USER ?? "admin";
    this.password = process.env.DEVIN_REMOTE_AUTH_PASSWORD ?? "";
    this.enabled = this.password.length > 0;
  }

  isAuthenticated(req: IncomingMessage): boolean {
    if (!this.enabled) return true;
    const token = parseCookies(req.headers.cookie).get(COOKIE_NAME);
    return token ? this.sessions.has(token) : false;
  }

  login(username: string, password: string, res: ServerResponse): boolean {
    if (!this.enabled || username !== this.username || !sameSecret(password, this.password)) return false;
    const token = randomBytes(32).toString("base64url");
    this.sessions.add(token);
    res.setHeader(
      "set-cookie",
      `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict`,
    );
    return true;
  }

  logout(req: IncomingMessage, res: ServerResponse): void {
    const token = parseCookies(req.headers.cookie).get(COOKIE_NAME);
    if (token) this.sessions.delete(token);
    res.setHeader("set-cookie", `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`);
  }

  status(req: IncomingMessage) {
    return { enabled: this.enabled, authenticated: this.isAuthenticated(req), username: this.enabled ? this.username : null };
  }
}
