import { NextResponse } from "next/server";
import { buildCareWorkflow } from "@/lib/care-workflows";
import type { CareEvent, CareRecipient } from "@/lib/care";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const MAX_REQUEST_BYTES = 50_000;

interface WorkflowRequest {
  message?: string;
  recipient?: CareRecipient | null;
  recentEvents?: CareEvent[];
  zipCode?: string;
  caregiverName?: string;
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Account storage is not configured." },
      { status: 503 }
    );
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { error: "The care update is too large." },
      { status: 413 }
    );
  }

  const supabase = await createSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims.sub) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const body = (await req.json()) as WorkflowRequest;
  if (JSON.stringify(body).length > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { error: "The care update is too large." },
      { status: 413 }
    );
  }
  const message = body.message?.trim();

  if (
    !message ||
    message.length > 6_000 ||
    (body.recentEvents?.length ?? 0) > 20 ||
    (body.zipCode?.length ?? 0) > 10 ||
    (body.caregiverName?.length ?? 0) > 100
  ) {
    return NextResponse.json(
      { error: "A caregiver message is required." },
      { status: 400 }
    );
  }

  const workflow = buildCareWorkflow({
    message,
    recipient: body.recipient ?? null,
    recentEvents: body.recentEvents ?? [],
    zipCode: body.zipCode,
    caregiverName: body.caregiverName,
  });

  return NextResponse.json(workflow, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
