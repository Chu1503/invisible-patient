import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/client";

const CHAT_RESPONSE_TIMEOUT_MS = 30_000;

export async function requestChat(payload: unknown): Promise<Response> {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const apiBase = configuredBase?.replace(/\/+$/, "") ?? "";
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    CHAT_RESPONSE_TIMEOUT_MS
  );

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiBase && isSupabaseConfigured()) {
      const { data } = await createClient().auth.getSession();
      if (data.session?.access_token) {
        headers.Authorization = `Bearer ${data.session.access_token}`;
      }
    }

    return await fetch(`${apiBase}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      credentials: apiBase ? "omit" : "same-origin",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function readApiError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}
