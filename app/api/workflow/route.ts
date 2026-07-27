import { NextResponse } from "next/server";
import { buildCareWorkflow } from "@/lib/care-workflows";
import type { CareEvent, CareRecipient } from "@/lib/care";

interface WorkflowRequest {
  message?: string;
  recipient?: CareRecipient | null;
  recentEvents?: CareEvent[];
  zipCode?: string;
  caregiverName?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as WorkflowRequest;
  const message = body.message?.trim();

  if (!message) {
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

  return NextResponse.json(workflow);
}
