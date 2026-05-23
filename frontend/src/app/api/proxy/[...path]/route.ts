import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function getKongUrl(): string {
  const kongUrl = process.env.KONG_URL;

  if (!kongUrl) {
    throw new Error("Missing required environment variable: KONG_URL");
  }

  return kongUrl.replace(/\/$/, "");
}

function shouldForwardBody(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

function createProxyHeaders(request: NextRequest, accessToken: string | null) {
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("cookie");

  if (accessToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { path } = await context.params;
  const kongUrl = getKongUrl();
  const accessToken = await getAccessTokenFromCookie();

  const targetUrl = new URL(`${kongUrl}/${path.join("/")}`);
  targetUrl.search = request.nextUrl.search;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: createProxyHeaders(request, accessToken),
    body: shouldForwardBody(request.method) ? await request.text() : undefined,
    cache: "no-store",
  });

  const responseBody = await response.arrayBuffer();
  const responseHeaders = new Headers(response.headers);

  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(responseBody, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return proxyRequest(request, context);
}
