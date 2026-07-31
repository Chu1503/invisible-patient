import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/prompts";
import {
  RequestValidationError,
  consumeRateLimit,
  corsHeadersForRequest,
  estimatedTokenCost,
  rateLimitHeaders,
  readBoundedJson,
  validateChatPayload,
} from "@/lib/api-security";
import {
  getAllowedAppOrigins,
  getAnthropicSettings,
  getRateLimitSettings,
} from "@/lib/server-env";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function OPTIONS(request: Request) {
  try {
    const headers = corsHeadersForRequest(request, getAllowedAppOrigins());
    return new Response(null, { status: 204, headers });
  } catch {
    return new Response(null, { status: 403 });
  }
}

function jsonError(
  message: string,
  status: number,
  headers: HeadersInit = {}
): Response {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...headers,
      },
    }
  );
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  const limits = getRateLimitSettings();
  let corsHeaders: HeadersInit = {};

  try {
    corsHeaders = corsHeadersForRequest(request, getAllowedAppOrigins());
  } catch (error) {
    const message =
      error instanceof RequestValidationError
        ? error.message
        : "Cross-origin requests are not allowed.";
    return jsonError(message, 403);
  }

  const apiLimit = consumeRateLimit(
    request,
    "api:chat",
    limits.apiRequests,
    limits.windowMs
  );

  if (!apiLimit.allowed) {
    return jsonError(
      "Too many requests. Please wait before trying again.",
      429,
      { ...corsHeaders, ...rateLimitHeaders(apiLimit) }
    );
  }

  try {
    const body = await readBoundedJson(request);
    const { messages, context } = validateChatPayload(body);
    const settings = getAnthropicSettings();
    const systemPrompt = buildSystemPrompt(context);

    const claudeRequestLimit = consumeRateLimit(
      request,
      "claude:requests",
      limits.claudeRequests,
      limits.windowMs
    );
    if (!claudeRequestLimit.allowed) {
      return jsonError(
        "You have reached the conversation limit for now. Please try again later.",
        429,
        { ...corsHeaders, ...rateLimitHeaders(claudeRequestLimit) }
      );
    }

    const tokenCost = estimatedTokenCost(
      messages,
      systemPrompt,
      settings.maxOutputTokens
    );
    const claudeTokenLimit = consumeRateLimit(
      request,
      "claude:tokens",
      limits.claudeTokens,
      limits.windowMs,
      tokenCost
    );
    if (!claudeTokenLimit.allowed) {
      return jsonError(
        "This conversation has reached its temporary token budget. Please try again later.",
        429,
        { ...corsHeaders, ...rateLimitHeaders(claudeTokenLimit) }
      );
    }

    const validatedAt = performance.now();
    const client = new Anthropic({
      apiKey: settings.apiKey,
      timeout: settings.timeoutMs,
      maxRetries: settings.maxRetries,
    });
    const stream = await client.messages.stream({
      model: settings.model,
      max_tokens: settings.maxOutputTokens,
      system: systemPrompt,
      messages,
    });
    const upstreamReadyAt = performance.now();

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch {
          controller.error(new Error("The response stream ended unexpectedly."));
        }
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Server-Timing": [
          `validation;dur=${(validatedAt - startedAt).toFixed(1)}`,
          `claude_setup;dur=${(upstreamReadyAt - validatedAt).toFixed(1)}`,
        ].join(", "),
        ...corsHeaders,
        ...rateLimitHeaders(claudeRequestLimit),
      },
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return jsonError(error.message, error.status, {
        ...corsHeaders,
        ...rateLimitHeaders(apiLimit),
      });
    }
    if (error instanceof Anthropic.APIError && error.status === 429) {
      return jsonError(
        "The AI service is temporarily busy. Please try again shortly.",
        429,
        { ...corsHeaders, ...rateLimitHeaders(apiLimit) }
      );
    }
    if (
      error instanceof Error &&
      error.message === "ANTHROPIC_API_KEY is not configured."
    ) {
      return jsonError("The companion is not configured.", 503, corsHeaders);
    }

    return jsonError(
      "I could not respond just now. Please try again in a moment.",
      500,
      { ...corsHeaders, ...rateLimitHeaders(apiLimit) }
    );
  }
}
