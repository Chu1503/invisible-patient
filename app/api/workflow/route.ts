import { NextResponse } from "next/server";
import { buildCareWorkflow } from "@/lib/care-workflows";
import type { CareEvent, CareRecipient } from "@/lib/care";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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

  const supabase = await createSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims.sub) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const body = (await req.json()) as WorkflowRequest;
  const message = body.message?.trim();

  if (!message || message.length > 12_000) {
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
