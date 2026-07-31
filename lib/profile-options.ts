export const CONDITION_OPTIONS = [
  "Alzheimer’s disease",
  "Vascular dementia",
  "Lewy body dementia",
  "Frontotemporal dementia",
  "Parkinson’s disease dementia",
  "Other dementia",
] as const;

export const STAGE_OPTIONS: Record<string, string[]> = {
  "Alzheimer’s disease": [
    "Early stage (mild)",
    "Middle stage (moderate)",
    "Late stage (severe)",
    "Not sure yet",
  ],
  "Vascular dementia": [
    "Early stage (mild)",
    "Middle stage (moderate)",
    "Late stage (severe)",
    "Not sure yet",
  ],
  "Lewy body dementia": [
    "Early stage",
    "Middle stage",
    "Late stage",
    "Not sure yet",
  ],
  "Frontotemporal dementia": [
    "Early stage",
    "Middle stage",
    "Late stage",
    "Not sure yet",
  ],
  "Parkinson’s disease dementia": [
    "Early stage (mild)",
    "Middle stage (moderate)",
    "Late stage (severe)",
    "Not sure yet",
  ],
  "Other dementia": [
    "Early stage (mild)",
    "Middle stage (moderate)",
    "Late stage (severe)",
    "Not sure yet",
  ],
};

export const LIVING_SITUATIONS = [
  "At home",
  "Shared home",
  "Assisted living",
  "Memory care",
  "Skilled nursing",
] as const;

export function getStagesForCondition(condition: string): string[] {
  return STAGE_OPTIONS[condition] ?? STAGE_OPTIONS["Other dementia"];
}

export function splitCareDetails(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildCareNotes(
  mobility: string,
  knownTriggers: string[]
): string {
  const lines: string[] = [];
  if (mobility.trim()) lines.push(`Mobility: ${mobility.trim()}`);
  if (knownTriggers.length) {
    lines.push(`Known triggers: ${knownTriggers.join(", ")}`);
  }
  return lines.join("\n");
}
