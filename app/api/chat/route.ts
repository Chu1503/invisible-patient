import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/prompts";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return new Response("Account storage is not configured.", { status: 503 });
    }

    const supabase = await createSupabaseClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    if (!claimsData?.claims.sub) {
      return new Response("Authentication required.", { status: 401 });
    }

    const { messages, context } = await req.json();

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 100 ||
      messages.some(
        (message) =>
          !message ||
          !["user", "assistant"].includes(message.role) ||
          typeof message.content !== "string" ||
          message.content.length > 12_000
      )
    ) {
      return new Response("A conversation is required.", { status: 400 });
    }

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
