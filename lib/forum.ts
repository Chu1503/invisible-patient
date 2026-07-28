"use client";

import { getActiveCareRecipient } from "./care";
import { createClient } from "./supabase/client";

export interface ForumPost {
  id: string;
  content: string;
  timestamp: number;
  authorTag: string;
  careStage: string;
  replies: ForumReply[];
  hasCrisis: boolean;
  likes: number;
}

export interface ForumReply {
  id: string;
  content: string;
  timestamp: number;
  authorTag: string;
  isAI: boolean;
}

export interface ForumFeed {
  posts: ForumPost[];
  likedPostIds: Set<string>;
}

const GENERAL_TOPICS = [
  "Daily care and routines",
  "Behavior and communication",
  "Caregiver wellbeing",
  "Family and support",
] as const;

const ALIAS_ADJECTIVES = [
  "Quiet",
  "Gentle",
  "Steady",
  "Kind",
  "Hopeful",
  "Patient",
  "Brave",
  "Calm",
] as const;

const ALIAS_NOUNS = [
  "Willow",
  "Cedar",
  "Maple",
  "River",
  "Meadow",
  "Harbor",
  "Sage",
  "Dawn",
] as const;

const CRISIS_WORDS = [
  "kill",
  "suicide",
  "end it",
  "want to die",
  "can't go on",
  "harm",
  "hurt them",
];

type ReplyRow = {
  id: string;
  content: string;
  anonymous_tag: string;
  created_at: string;
};

type PostRow = {
  id: string;
  content: string;
  topic: string;
  anonymous_tag: string;
  created_at: string;
  likes_count: number;
  circle_replies: ReplyRow[] | null;
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

async function getAnonymousTag(): Promise<string> {
  const { data, error } = await createClient().auth.getClaims();
  const userId = data?.claims.sub;
  if (error || !userId) throw error ?? new Error("Authentication required");

  const firstHash = stableHash(userId);
  const secondHash = stableHash(`${userId}:circle`);
  const adjective = ALIAS_ADJECTIVES[firstHash % ALIAS_ADJECTIVES.length];
  const noun = ALIAS_NOUNS[secondHash % ALIAS_NOUNS.length];
  const number = (stableHash(`${userId}:number`) % 90) + 10;
  return `${adjective}${noun}${number}`;
}

function stageLabel(stage: string): string {
  const normalized = stage.toLowerCase();
  if (normalized.startsWith("early")) return "Early stage";
  if (normalized.startsWith("middle")) return "Middle stage";
  if (normalized.startsWith("late")) return "Late stage";
  return "Stage not specified";
}

export function getCircleTopics(): string[] {
  const recipient = getActiveCareRecipient();
  if (!recipient) return [...GENERAL_TOPICS];

  return Array.from(
    new Set([
      `${recipient.condition} · ${stageLabel(recipient.stage)}`,
      `${recipient.condition} caregiving`,
      ...GENERAL_TOPICS,
    ])
  );
}

export function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_WORDS.some((word) => lower.includes(word));
}

export async function getForumFeed(): Promise<ForumFeed> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("circle_posts")
    .select(
      "id, content, topic, anonymous_tag, created_at, likes_count, circle_replies(id, content, anonymous_tag, created_at)"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const rows = (data ?? []) as PostRow[];
  const postIds = rows.map((row) => row.id);
  let likedPostIds = new Set<string>();

  if (postIds.length) {
    const { data: likes, error: likesError } = await supabase
      .from("circle_likes")
      .select("post_id")
      .in("post_id", postIds);
    if (likesError) throw likesError;
    likedPostIds = new Set(
      (likes ?? []).map((like: { post_id: string }) => String(like.post_id))
    );
  }

  const posts = rows.map((row) => ({
    id: row.id,
    content: row.content,
    timestamp: new Date(row.created_at).getTime(),
    authorTag: row.anonymous_tag,
    careStage: row.topic,
    hasCrisis: detectCrisis(row.content),
    likes: row.likes_count,
    replies: (row.circle_replies ?? [])
      .map((reply) => ({
        id: reply.id,
        content: reply.content,
        timestamp: new Date(reply.created_at).getTime(),
        authorTag: reply.anonymous_tag,
        isAI: false,
      }))
      .sort((a, b) => a.timestamp - b.timestamp),
  }));

  return { posts, likedPostIds };
}

export async function createPost(
  content: string,
  topic: string
): Promise<void> {
  const { error } = await createClient().from("circle_posts").insert({
    content,
    topic,
    anonymous_tag: await getAnonymousTag(),
  });
  if (error) throw error;
}

export async function createReply(
  postId: string,
  content: string
): Promise<void> {
  const { error } = await createClient().from("circle_replies").insert({
    post_id: postId,
    content,
    anonymous_tag: await getAnonymousTag(),
  });
  if (error) throw error;
}

export async function togglePostLike(
  postId: string,
  currentlyLiked: boolean
): Promise<void> {
  const request = currentlyLiked
    ? createClient().from("circle_likes").delete().eq("post_id", postId)
    : createClient().from("circle_likes").insert({ post_id: postId });
  const { error } = await request;
  if (error) throw error;
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
