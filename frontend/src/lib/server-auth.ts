import { cookies } from "next/headers";
import crypto from "node:crypto";

export const ACCESS_TOKEN_COOKIE = "crash_access_token";
export const REFRESH_TOKEN_COOKIE = "crash_refresh_token";
export const PKCE_VERIFIER_COOKIE = "crash_pkce_verifier";
export const AUTH_STATE_COOKIE = "crash_auth_state";

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface AuthenticatedUser {
  sub: string;
  username: string;
  name?: string;
  email?: string;
}

interface JwtPayload {
  exp?: number;
  sub?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function base64UrlEncode(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function createAuthState(): string {
  return base64UrlEncode(crypto.randomBytes(32));
}

export function createPkcePair(): {
  verifier: string;
  challenge: string;
} {
  const verifier = base64UrlEncode(crypto.randomBytes(64));
  const challenge = base64UrlEncode(
    crypto.createHash("sha256").update(verifier).digest(),
  );

  return {
    verifier,
    challenge,
  };
}

export function buildAuthorizationUrl(params: {
  state: string;
  codeChallenge: string;
}): string {
  const authorizationUrl = getRequiredEnv("KEYCLOAK_AUTHORIZATION_URL");
  const clientId = getRequiredEnv("KEYCLOAK_CLIENT_ID");
  const redirectUri = process.env.KEYCLOAK_REDIRECT_URI ?? getAuthRedirectUri();

  const url = new URL(authorizationUrl);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

export async function exchangeCodeForToken(params: {
  code: string;
  codeVerifier: string;
}): Promise<TokenSet> {
  const tokenUrl = getRequiredEnv("KEYCLOAK_TOKEN_URL");
  const clientId = getRequiredEnv("KEYCLOAK_CLIENT_ID");
  const redirectUri = process.env.KEYCLOAK_REDIRECT_URI ?? getAuthRedirectUri();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code: params.code,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error_description ??
        data?.error ??
        "Failed to exchange authorization code for token.",
    );
  }

  return data as TokenSet;
}

function decodeJwtPayload(accessToken: string): JwtPayload | null {
  const [, payload] = accessToken.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");

    return JSON.parse(
      Buffer.from(normalizedPayload, "base64").toString("utf8"),
    ) as JwtPayload;
  } catch {
    return null;
  }
}

export function getUserFromAccessToken(
  accessToken: string,
): AuthenticatedUser | null {
  const payload = decodeJwtPayload(accessToken);

  if (!payload?.sub) {
    return null;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp <= nowInSeconds) {
    return null;
  }

  return {
    sub: payload.sub,
    username: payload.preferred_username ?? "player",
    name: payload.name,
    email: payload.email,
  };
}

export async function getAccessTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function setAuthCookies(tokenSet: TokenSet): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, tokenSet.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: tokenSet.expires_in ?? 300,
  });

  if (tokenSet.refresh_token) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, tokenSet.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: tokenSet.refresh_expires_in ?? 1800,
    });
  }
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(PKCE_VERIFIER_COOKIE);
  cookieStore.delete(AUTH_STATE_COOKIE);
}

export async function setTemporaryAuthCookies(params: {
  state: string;
  codeVerifier: string;
}): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_STATE_COOKIE, params.state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 300,
  });

  cookieStore.set(PKCE_VERIFIER_COOKIE, params.codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 300,
  });
}

export async function getTemporaryAuthCookies(): Promise<{
  state?: string;
  codeVerifier?: string;
}> {
  const cookieStore = await cookies();

  return {
    state: cookieStore.get(AUTH_STATE_COOKIE)?.value,
    codeVerifier: cookieStore.get(PKCE_VERIFIER_COOKIE)?.value,
  };
}

export async function clearTemporaryAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(AUTH_STATE_COOKIE);
  cookieStore.delete(PKCE_VERIFIER_COOKIE);
}

function getPublicAppUrl(): string {
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
