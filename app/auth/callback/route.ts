import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/api-security";
import { getRateLimitSettings } from "@/lib/server-env";
import { getSupabaseConfig } from "@/lib/supabase/config";

function safeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const settings = getRateLimitSettings();
  const rateLimit = consumeRateLimit(
    request,
    "auth:callback",
    settings.loginAttempts,
    settings.windowMs
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many sign in attempts. Please wait before trying again." },
      {
        status: 429,
        headers: {
          "Cache-Control": "private, no-store",
          ...rateLimitHeaders(rateLimit),
        },
      }
    );
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(next, request.url));
  Object.entries(rateLimitHeaders(rateLimit)).forEach(([name, value]) =>
    response.headers.set(name, String(value))
  );

  if (!code) {
    const errorUrl = new URL("/auth", request.url);
    errorUrl.searchParams.set("error", "This sign-in link is invalid or expired.");
    return NextResponse.redirect(errorUrl);
  }

  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value)
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errorUrl = new URL("/auth", request.url);
    errorUrl.searchParams.set(
      "error",
      "We could not verify that link. Please request a new one."
    );
    return NextResponse.redirect(errorUrl);
  }

  return response;
}
