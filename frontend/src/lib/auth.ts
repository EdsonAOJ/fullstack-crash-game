import crypto from "node:crypto";

export const AUTH_COOKIE_NAMES = {
  accessToken: "crash_access_token",
  refreshToken: "crash_refresh_token",
  idToken: "crash_id_token",
  oauthState: "crash_oauth_state",
  codeVerifier: "crash_code_verifier",
} as const;

export interface AuthenticatedPlayer {
  username: string;
  name?: string;
  email?: string;
  subject?: string;
}

export interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  refresh_token?: string;
  token_type: "Bearer";
  id_token?: string;
  scope?: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getPublicAppUrl(): string {
  return (process.env.APP_PUBLIC_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function getAuthRedirectUri(): string {
  return `${getPublicAppUrl()}/api/auth/callback`;
}

export function getPostLoginRedirectUrl(): string {
  return `${getPublicAppUrl()}/`;
}

export function getLoginUrlWithError(message: string): string {
  const loginUrl = new URL("/login", getPublicAppUrl());
  loginUrl.searchParams.set("error", message);

  return loginUrl.toString();
}
export function createRandomBase64Url(size = 32): string {
  return crypto.randomBytes(size).toString("base64url");
}

export function createCodeChallenge(codeVerifier: string): string {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

export function decodeJwtPayload<TPayload extends Record<string, unknown>>(
  token: string,
): TPayload {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Invalid JWT payload.");
  }

  const decoded = Buffer.from(payload, "base64url").toString("utf8");

  return JSON.parse(decoded) as TPayload;
}

export function parseAuthenticatedPlayerFromToken(
  accessToken: string,
): AuthenticatedPlayer {
  const payload = decodeJwtPayload<{
    sub?: string;
    preferred_username?: string;
    name?: string;
    email?: string;
  }>(accessToken);

  return {
    subject: payload.sub,
    username: payload.preferred_username ?? "player",
    name: payload.name,
    email: payload.email,
  };
}

export function getAuthCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  };
}

export function getPublicCookieOptions(maxAge?: number) {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  };
}
