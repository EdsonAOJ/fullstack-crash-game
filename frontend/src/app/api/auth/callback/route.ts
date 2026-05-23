import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  REFRESH_TOKEN_COOKIE,
  exchangeCodeForToken,
  getLoginUrlWithError,
  getPostLoginRedirectUrl,
} from "@/lib/server-auth";

function redirectToLoginWithError(message: string) {
  const response = NextResponse.redirect(getLoginUrlWithError(message));

  response.cookies.delete(AUTH_STATE_COOKIE);
  response.cookies.delete(PKCE_VERIFIER_COOKIE);

  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription =
    request.nextUrl.searchParams.get("error_description");

  if (error) {
    return redirectToLoginWithError(errorDescription ?? error);
  }

  if (!code || !state) {
    return redirectToLoginWithError("Authorization code ou state ausente.");
  }

  const stateCookie = request.cookies.get(AUTH_STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(PKCE_VERIFIER_COOKIE)?.value;

  if (!stateCookie || stateCookie !== state) {
    return redirectToLoginWithError("State inválido na autenticação.");
  }

  if (!codeVerifier) {
    return redirectToLoginWithError("Code verifier ausente.");
  }

  try {
    const tokenSet = await exchangeCodeForToken({
      code,
      codeVerifier,
    });

    const response = NextResponse.redirect(getPostLoginRedirectUrl());

    response.cookies.set(ACCESS_TOKEN_COOKIE, tokenSet.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: tokenSet.expires_in ?? 300,
    });

    if (tokenSet.refresh_token) {
      response.cookies.set(REFRESH_TOKEN_COOKIE, tokenSet.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: tokenSet.refresh_expires_in ?? 1800,
      });
    }

    response.cookies.delete(AUTH_STATE_COOKIE);
    response.cookies.delete(PKCE_VERIFIER_COOKIE);

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao finalizar autenticação.";

    return redirectToLoginWithError(message);
  }
}
