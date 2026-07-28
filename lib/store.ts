import { syncCheckin, syncLastMentalState } from "./cloud-sync";

export type MentalState = "calm" | "restless" | "anxious" | "hopeful" | "tired" | "overwhelmed";
export type RiskLevel = "low" | "moderate" | "high" | "crisis";

export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: number;
}

export interface CheckinEntry {
  id: string;
  date: string;
  timestamp: number;
  mentalState: MentalState;
  zbiEstimate: number;
  zbiAnswers: number[];
  resonanceScore: number;
  emotions: string[];
  riskLevel: RiskLevel;
  messages: Message[];
  // formAnswers?: FormAnswers;
}

// export interface FormAnswers {
//   q1: number; // No time for yourself (0-4)
//   q2: number; // Stressed managing care + other responsibilities (0-4)
//   q3: number; // Anger toward the person you care for (0-4)
//   q4: number; // Feel you've lost control (0-4)
//   q5: number; // Physical health suffered (0-4)
//   q6: number; // Feel isolated (0-4)
//   q7: number; // Uncertain about the future (0-4)
//   q8: number; // Feeling down or hopeless past 2 weeks (0-3)
//   q9: number; // Little interest or pleasure in things (0-3)
// }

export interface UserProfile {
  username: string;
  createdAt: number;
}

const KEYS = {
  profile: "ip_profile",
  checkins: "ip_checkins",
  lastState: "ip_last_state",
};

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.profile);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export function ensureProfile(): UserProfile {
  const existing = getProfile();
  if (existing) return existing;
  const profile: UserProfile = { username: "CAREGIVER", createdAt: Date.now() };
  saveProfile(profile);
  return profile;
}

export function getCheckins(): CheckinEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.checkins);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function saveCheckin(entry: CheckinEntry): void {
  if (typeof window === "undefined") return;
  const checkins = getCheckins();
  const idx = checkins.findIndex((c) => c.id === entry.id);
  if (idx >= 0) checkins[idx] = entry;
  else checkins.push(entry);
  localStorage.setItem(KEYS.checkins, JSON.stringify(checkins));
  syncCheckin(entry);
}

export function getLatestCheckin(): CheckinEntry | null {
  const checkins = getCheckins();
  if (!checkins.length) return null;
  return checkins.sort((a, b) => b.timestamp - a.timestamp)[0];
}

export function getLatestZbiCheckin(): CheckinEntry | null {
  const checkins = getCheckins()
    .filter((checkin) => (checkin.zbiAnswers ?? []).length > 0)
    .sort((a, b) => b.timestamp - a.timestamp);
  return checkins[0] ?? null;
}

export function getLastMentalState(): MentalState {
  if (typeof window === "undefined") return "restless";
  return (localStorage.getItem(KEYS.lastState) as MentalState) || "restless";
}

export function saveLastMentalState(state: MentalState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.lastState, state);
  syncLastMentalState(state);
}

export function getLast7DaysCheckins(): CheckinEntry[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return getCheckins()
    .filter((c) => c.timestamp >= cutoff)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export const AURA_COLORS: Record<MentalState, string> = {
  calm:       "#2E756D",
  restless:   "#17645F",
  anxious:    "#0B4B4A",
  hopeful:    "#438275",
  tired:      "#56716F",
  overwhelmed:"#063A3D",
};

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function calculateZbiFromAnswers(answers: number[]): number {
  const raw = answers.reduce((sum, a) => sum + a, 0);
  return Math.round((raw / 48) * 88);
}
