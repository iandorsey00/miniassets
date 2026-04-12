import { NextRequest, NextResponse } from "next/server";

import { AUTH_ROUTES, MINI_AUTH_LOGIN_REDIRECT_ENABLED } from "@/lib/auth-config";

function getAppOrigin(request: NextRequest) {
  const configuredAppUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (configuredAppUrl) {
    return configuredAppUrl;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const protocol = forwardedProto || (request.nextUrl.protocol.replace(":", "") || "https");

  if (!host) {
    return "";
  }

  return `${protocol}://${host}`.replace(/\/$/, "");
}

export function GET(request: NextRequest) {
  const baseUrl = process.env.MINIAUTH_BASE_URL?.trim().replace(/\/$/, "");
  if (!baseUrl || !MINI_AUTH_LOGIN_REDIRECT_ENABLED) {
    return NextResponse.redirect(new URL(AUTH_ROUTES.login, request.url));
  }

  const requestedPath = request.nextUrl.searchParams.get("returnPath") || AUTH_ROUTES.login;
  const safePath = requestedPath.startsWith("/") ? requestedPath : AUTH_ROUTES.login;
  const appOrigin = getAppOrigin(request);
  const returnTo = appOrigin ? `${appOrigin}${safePath}` : "";
  const targetUrl = new URL(`${baseUrl}/logout`);

  if (returnTo) {
    targetUrl.searchParams.set("returnTo", returnTo);
  }

  return NextResponse.redirect(targetUrl);
}
