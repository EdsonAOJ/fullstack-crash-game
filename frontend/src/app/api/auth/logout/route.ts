import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/server-auth";

export async function POST(): Promise<NextResponse> {
  await clearAuthCookies();

  return NextResponse.json({
    success: true,
    data: {
      loggedOut: true,
    },
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  await clearAuthCookies();

  return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
}
