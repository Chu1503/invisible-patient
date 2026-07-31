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
import { getAllowedAppOrigins, getRateLimitSettings } from "@/lib/server-env";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  try {
    const headers = corsHeadersForRequest(request, getAllowedAppOrigins());
    return new Response(null, { status: 204, headers });
  } catch {
    return new Response(null, { status: 403 });
  }
}

export async function POST(request: Request) {
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
      { status: 403, headers: { "Cache-Control": "no-store" } }
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
          "Cache-Control": "no-store",
          ...corsHeaders,
          ...rateLimitHeaders(rateLimit),
        },
      }
    );
  }

  try {
    const body = await readBoundedJson(request, 16 * 1024);
    const input = validateWorkflowPayload(body);
    const workflow = buildCareWorkflow(input);

    return NextResponse.json(workflow, {
      headers: {
        "Cache-Control": "no-store",
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
            "Cache-Control": "no-store",
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
          "Cache-Control": "no-store",
          ...corsHeaders,
          ...rateLimitHeaders(rateLimit),
        },
      }
    );
  }
}
