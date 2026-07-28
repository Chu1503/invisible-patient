import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/prompts";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const MAX_REQUEST_BYTES = 100_000;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARACTERS = 6_000;
const MAX_TOTAL_MESSAGE_CHARACTERS = 50_000;
const MAX_CONTEXT_CHARACTERS = 20_000;

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return new Response("Account storage is not configured.", { status: 503 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response("Conversation support is not configured.", {
        status: 503,
      });
    }

    const declaredLength = Number(req.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_REQUEST_BYTES) {
      return new Response("The conversation is too large.", { status: 413 });
    }

    const supabase = await createSupabaseClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    if (!claimsData?.claims.sub) {
      return new Response("Authentication required.", { status: 401 });
    }

    const { messages, context } = await req.json();
    const totalMessageCharacters = Array.isArray(messages)
      ? messages.reduce(
          (total, message) =>
            total +
            (typeof message?.content === "string"
              ? message.content.length
              : 0),
          0
        )
      : 0;
    const contextCharacters = context
      ? JSON.stringify(context).length
      : 0;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > MAX_MESSAGES ||
      totalMessageCharacters > MAX_TOTAL_MESSAGE_CHARACTERS ||
      contextCharacters > MAX_CONTEXT_CHARACTERS ||
      messages.some(
        (message) =>
          !message ||
          !["user", "assistant"].includes(message.role) ||
          typeof message.content !== "string" ||
          message.content.length > MAX_MESSAGE_CHARACTERS
      )
    ) {
      return new Response("A conversation is required.", { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const stream = await client.messages.stream({
      model: "claude-opus-4-5",
      max_tokens: 220,
      system: buildSystemPrompt(context),
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
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
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(
      "I could not respond just now. Please try again in a moment.",
      { status: 500 }
    );
  }
}
