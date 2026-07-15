import { getRequestHeader } from "@tanstack/react-start/server";

// __Host- binds the cookie to this exact origin + path '/' (no Domain, requires Secure).
const SESSION_COOKIE = "__Host-session";
const OAUTH_COOKIE = "__Host-oauth";
const OAUTH_COOKIE_MAX_AGE = 600; // 10 minutes — one-shot, just for the redirect round trip

function readCookie(name: string): string | null {
  const header = getRequestHeader("cookie");
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

function buildCookie(name: string, value: string, maxAgeSeconds: number): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

function buildClearedCookie(name: string): string {
  return `${name}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function readSessionToken(): string | null {
  return readCookie(SESSION_COOKIE);
}

export function buildSessionCookie(token: string, expiresAt: Date): string {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return buildCookie(SESSION_COOKIE, token, maxAge);
}

export function buildClearedSessionCookie(): string {
  return buildClearedCookie(SESSION_COOKIE);
}

export type OAuthAttempt = { state: string; verifier: string };

export function readOAuthCookie(): OAuthAttempt | null {
  const raw = readCookie(OAUTH_COOKIE);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as OAuthAttempt).state === "string" &&
      typeof (parsed as OAuthAttempt).verifier === "string"
    ) {
      return parsed as OAuthAttempt;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildOAuthCookie(attempt: OAuthAttempt): string {
  return buildCookie(OAUTH_COOKIE, JSON.stringify(attempt), OAUTH_COOKIE_MAX_AGE);
}

export function buildClearedOAuthCookie(): string {
  return buildClearedCookie(OAUTH_COOKIE);
}
