import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  ADSBAO_LOCALE_HEADER,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  normalizeLocaleSelection,
  resolveLocaleFromSearchParams,
} from "@/features/app-shell/i18n/i18nModel";

function applyLocale(request) {
  const queryLocale = resolveLocaleFromSearchParams(request.nextUrl.searchParams);
  const cookieLocale = request.cookies.get(LOCALE_STORAGE_KEY)?.value;
  const locale = queryLocale || normalizeLocaleSelection(cookieLocale, DEFAULT_LOCALE);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(ADSBAO_LOCALE_HEADER, locale);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.cookies.set(LOCALE_STORAGE_KEY, locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

export default clerkMiddleware((auth, request) => applyLocale(request));

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api)(.*)",
  ],
};
