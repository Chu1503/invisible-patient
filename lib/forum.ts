export interface ForumPost {
  id: string;
  content: string;
  timestamp: number;
  authorTag: string;
  careStage: string;
  replies: ForumReply[];
  hasCrisis: boolean;
}

export interface ForumReply {
  id: string;
  content: string;
  timestamp: number;
  authorTag: string;
  isAI: boolean;
}

const CARE_STAGES = [
  "Early-stage dementia caregiving",
  "Mid-stage dementia caregiving",
  "Late-stage dementia caregiving",
  "Brain injury caregiving",
  "Post-stroke caregiving",
  "General caregiving",
];

const ANONYMOUS_TAGS = [
  "WillowMorning","CedarNight","MapleQuiet","RiverStone","OakHollow",
  "MistField","SageWind","PineHaven","FernValley","IvyBridge","DawnPath",
  "TwilightMeadow","StillWater","HeatherRidge","BirchGrove",
];

const CRISIS_WORDS = [
  "kill","suicide","end it","want to die","can't go on","harm","hurt them",
];

function generateTag(): string {
  return ANONYMOUS_TAGS[Math.floor(Math.random() * ANONYMOUS_TAGS.length)] +
    Math.floor(Math.random() * 99 + 1);
}

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_WORDS.some((w) => lower.includes(w));
}

const SEED_POSTS: ForumPost[] = [
  {
    id: "seed1",
    content: "3am and he's been awake since midnight, pacing the hallway, calling out for his mother who passed 20 years ago. I don't know how to tell him again. I just sit with him and hold his hand.",
    timestamp: Date.now() - 1000 * 60 * 60 * 5,
    authorTag: "WillowMorning42",
    careStage: "Mid-stage dementia caregiving",
    hasCrisis: false,
    replies: [
      {
        id: "r1",
        content: "I've been through exactly this. Sundowning at 3am with my mom. You're not alone in this moment, even when it feels like the whole world is asleep except you two.",
        timestamp: Date.now() - 1000 * 60 * 60 * 4,
        authorTag: "CedarNight17",
        isAI: false,
      },
    ],
  },
  {
    id: "seed2",
    content: "I snapped at him today. He asked me the same question for the 40th time and I just raised my voice. He looked so confused and scared. I feel like a monster. How do you forgive yourself?",
    timestamp: Date.now() - 1000 * 60 * 60 * 12,
    authorTag: "MapleQuiet83",
    careStage: "Mid-stage dementia caregiving",
    hasCrisis: false,
    replies: [
      {
        id: "r2",
        content: "You are not a monster. You are a human being who is exhausted beyond what most people could imagine. The guilt means you love him. Be as gentle with yourself as you are with him.",
        timestamp: Date.now() - 1000 * 60 * 60 * 11,
        authorTag: "AI Companion",
        isAI: true,
      },
    ],
  },
  {
    id: "seed3",
    content: "My siblings haven't visited in 4 months. They ask how dad is doing on the phone but never ask how I'm doing. I've become invisible.",
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    authorTag: "RiverStone29",
    careStage: "Late-stage dementia caregiving",
    hasCrisis: false,
    replies: [],
  },
];

export function getPosts(): ForumPost[] {
  if (typeof window === "undefined") return SEED_POSTS;
  const raw = localStorage.getItem("ip_forum");
  if (!raw) {
    localStorage.setItem("ip_forum", JSON.stringify(SEED_POSTS));
    return SEED_POSTS;
  }
  try { return JSON.parse(raw); } catch { return SEED_POSTS; }
}

export function savePosts(posts: ForumPost[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("ip_forum", JSON.stringify(posts));
}

export function getMyTag(): string {
  if (typeof window === "undefined") return "Anonymous";
  const existing = localStorage.getItem("ip_forum_tag");
  if (existing) return existing;
  const tag = generateTag();
  localStorage.setItem("ip_forum_tag", tag);
  return tag;
}

export function getMyStage(): string {
  if (typeof window === "undefined") return CARE_STAGES[0];
  const existing = localStorage.getItem("ip_forum_stage");
  return existing || CARE_STAGES[0];
}

export function saveMyStage(stage: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("ip_forum_stage", stage);
}

export function createPost(content: string, stage: string): ForumPost {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    content,
    timestamp: Date.now(),
    authorTag: getMyTag(),
    careStage: stage,
    hasCrisis: detectCrisis(content),
    replies: [],
  };
}

export function createReply(content: string, isAI = false): ForumReply {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    content,
    timestamp: Date.now(),
    authorTag: isAI ? "AI Companion" : getMyTag(),
    isAI,
  };
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export { CARE_STAGES, detectCrisis };
