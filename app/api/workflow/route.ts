import { NextResponse } from "next/server";
import { buildCareWorkflow } from "@/lib/care-workflows";
import {
  RequestValidationError,
  consumeRateLimit,
  corsHeadersForRequest,
  rateLimitHeaders,
  readBoundedJson,
  validateWorkflowPayload,
} from "@/lib/api-security";
import { logDevelopmentTiming, perfStart } from "@/lib/performance";
import { getAllowedAppOrigins, getRateLimitSettings } from "@/lib/server-env";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  try {
    const headers = corsHeadersForRequest(request, getAllowedAppOrigins());
    return new Response(null, { status: 204, headers });
  } catch {
    return new Response(null, { status: 403 });
  }
}

async function hasAuthenticatedAccount(request: Request): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const origin = request.headers.get("origin");
  const isInstalledApp =
    Boolean(origin && getAllowedAppOrigins().includes(origin)) &&
    request.headers.get("user-agent")?.includes("InvisiblePatient/");
  if (isInstalledApp) return true;

  const authorization = request.headers.get("authorization");
  const jwt = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : undefined;
  const supabase = await createSupabaseClient();
  const { data } = await supabase.auth.getClaims(jwt);
  return Boolean(data?.claims.sub);
}

export async function POST(request: Request) {
  const requestStartedAt = perfStart();
  const limits = getRateLimitSettings();
  let corsHeaders: HeadersInit = {};

  try {
    corsHeaders = corsHeadersForRequest(request, getAllowedAppOrigins());
  } catch (error) {
    const message =
      error instanceof RequestValidationError
        ? error.message
        : "Cross-origin requests are not allowed.";
    return NextResponse.json(
      { error: message },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const rateLimit = consumeRateLimit(
    request,
    "api:workflow",
    limits.apiRequests,
    limits.windowMs
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: {
          "Cache-Control": "private, no-store",
          ...corsHeaders,
          ...rateLimitHeaders(rateLimit),
        },
      }
    );
  }

  try {
    if (!(await hasAuthenticatedAccount(request))) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401, headers: { ...corsHeaders, "Cache-Control": "private, no-store" } }
      );
    }

    const body = await readBoundedJson(request, 50_000);
    const input = validateWorkflowPayload(body);
    const workflow = buildCareWorkflow(input);
    logDevelopmentTiming("workflow-api.total", requestStartedAt);

    return NextResponse.json(workflow, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...corsHeaders,
        ...rateLimitHeaders(rateLimit),
      },
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          headers: {
            "Cache-Control": "private, no-store",
            ...corsHeaders,
            ...rateLimitHeaders(rateLimit),
          },
        }
      );
    }

    return NextResponse.json(
      { error: "The care workflow could not be prepared." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
          ...corsHeaders,
          ...rateLimitHeaders(rateLimit),
        },
      }
    );
  }
}
