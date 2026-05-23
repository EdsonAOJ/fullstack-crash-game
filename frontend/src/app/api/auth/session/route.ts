import { NextResponse } from "next/server";
import {
  getAccessTokenFromCookie,
  getUserFromAccessToken,
} from "@/lib/server-auth";

export async function GET(): Promise<NextResponse> {
  const accessToken = await getAccessTokenFromCookie();

  if (!accessToken) {
    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated: false,
        user: null,
      },
    });
  }

  const user = getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated: false,
        user: null,
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      isAuthenticated: true,
      user,
    },
  });
}
