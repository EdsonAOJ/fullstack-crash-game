import { NextResponse } from "next/server";
import {
  AUTH_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  buildAuthorizationUrl,
  createAuthState,
  createPkcePair,
} from "@/lib/server-auth";

export async function GET(): Promise<NextResponse> {
  const state = createAuthState();
  const pkce = createPkcePair();

  const authorizationUrl = buildAuthorizationUrl({
    state,
    codeChallenge: pkce.challenge,
  });

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set(AUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 300,
  });

  response.cookies.set(PKCE_VERIFIER_COOKIE, pkce.verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 300,
  });

  return response;
}
