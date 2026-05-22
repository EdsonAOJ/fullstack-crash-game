import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  const tokenUrl = process.env.KEYCLOAK_TOKEN_URL;
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const username = process.env.KEYCLOAK_USERNAME;
  const password = process.env.KEYCLOAK_PASSWORD;

  if (!tokenUrl || !clientId || !username || !password) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication environment variables are not configured.",
      },
      {
        status: 500,
      },
    );
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "password",
      username,
      password,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();

    return NextResponse.json(
      {
        success: false,
        error: `Keycloak token request failed: ${response.status} ${body}`,
      },
      {
        status: response.status,
      },
    );
  }

  const body = (await response.json()) as {
    access_token?: string;
  };

  if (!body.access_token) {
    return NextResponse.json(
      {
        success: false,
        error: "Keycloak response did not include access_token.",
      },
      {
        status: 502,
      },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      accessToken: body.access_token,
    },
  });
}
