"use client";

import { getActiveCareRecipient } from "./care";
import { logDevelopmentTiming, perfStart } from "./performance";
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
  isOwned: boolean;
  isPending?: boolean;
  editedAt?: number;
}

export interface ForumReply {
  id: string;
  content: string;
  timestamp: number;
  authorTag: string;
  isAI: boolean;
  isOwned: boolean;
  isPending?: boolean;
  editedAt?: number;
}

export interface ForumFeed {
  posts: ForumPost[];
  likedPostIds: Set<string>;
  currentUserTag: string;
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

let anonymousTagPromise: Promise<string> | null = null;

type ReplyRow = {
  id: string;
  content: string;
  anonymous_tag: string;
  created_at: string;
  edited_at: string | null;
};

type PostRow = {
  id: string;
  content: string;
  topic: string;
  anonymous_tag: string;
  created_at: string;
  edited_at: string | null;
  likes_count: number;
  circle_replies: ReplyRow[] | null;
};

type OwnedContentRow = {
  content_type: "post" | "reply";
  content_id: string;
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
  if (!anonymousTagPromise) {
    anonymousTagPromise = (async () => {
      const { data, error } = await createClient().auth.getClaims();
      const userId = data?.claims.sub;
      if (error || !userId) {
        throw error ?? new Error("Authentication required");
      }

      const firstHash = stableHash(userId);
      const secondHash = stableHash(`${userId}:circle`);
      const adjective = ALIAS_ADJECTIVES[firstHash % ALIAS_ADJECTIVES.length];
      const noun = ALIAS_NOUNS[secondHash % ALIAS_NOUNS.length];
      const number = (stableHash(`${userId}:number`) % 90) + 10;
      return `${adjective}${noun}${number}`;
    })().catch((error) => {
      anonymousTagPromise = null;
      throw error;
    });
  }

  return anonymousTagPromise;
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
  const feedStartedAt = perfStart();
  const supabase = createClient();
  const [postsResult, ownershipResult, currentUserTag] = await Promise.all([
    supabase
      .from("circle_posts")
      .select(
        "id, content, topic, anonymous_tag, created_at, edited_at, likes_count, circle_replies(id, content, anonymous_tag, created_at, edited_at)"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.rpc("get_my_circle_content_ids"),
    getAnonymousTag(),
  ]);

  if (postsResult.error) throw postsResult.error;
  if (ownershipResult.error) throw ownershipResult.error;

  const rows = (postsResult.data ?? []) as PostRow[];
  const postIds = rows.map((row) => row.id);
  let likedPostIds = new Set<string>();
  const ownedRows = (ownershipResult.data ?? []) as OwnedContentRow[];
  const ownedPostIds = new Set(
    ownedRows
      .filter((row) => row.content_type === "post")
      .map((row) => row.content_id)
  );
  const ownedReplyIds = new Set(
    ownedRows
      .filter((row) => row.content_type === "reply")
      .map((row) => row.content_id)
  );

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
    isOwned: ownedPostIds.has(row.id),
    editedAt: row.edited_at
      ? new Date(row.edited_at).getTime()
      : undefined,
    replies: (row.circle_replies ?? [])
      .map((reply) => ({
        id: reply.id,
        content: reply.content,
        timestamp: new Date(reply.created_at).getTime(),
        authorTag: reply.anonymous_tag,
        isAI: false,
        isOwned: ownedReplyIds.has(reply.id),
        editedAt: reply.edited_at
          ? new Date(reply.edited_at).getTime()
          : undefined,
      }))
      .sort((a, b) => a.timestamp - b.timestamp),
  }));

  logDevelopmentTiming("circle.feed", feedStartedAt);
  return { posts, likedPostIds, currentUserTag };
}

export async function createPost(
  content: string,
  topic: string,
  knownAnonymousTag?: string
): Promise<ForumPost> {
  const anonymousTag = knownAnonymousTag ?? (await getAnonymousTag());
  const { data, error } = await createClient()
    .from("circle_posts")
    .insert({
      content,
      topic,
      anonymous_tag: anonymousTag,
    })
    .select(
      "id, content, topic, anonymous_tag, created_at, edited_at, likes_count"
    )
    .single();
  if (error) throw error;
  const row = data as Omit<PostRow, "circle_replies">;
  return {
    id: row.id,
    content: row.content,
    timestamp: new Date(row.created_at).getTime(),
    authorTag: row.anonymous_tag,
    careStage: row.topic,
    replies: [],
    hasCrisis: detectCrisis(row.content),
    likes: row.likes_count,
    isOwned: true,
    editedAt: row.edited_at
      ? new Date(row.edited_at).getTime()
      : undefined,
  };
}

export async function createReply(
  postId: string,
  content: string,
  knownAnonymousTag?: string
): Promise<ForumReply> {
  const anonymousTag = knownAnonymousTag ?? (await getAnonymousTag());
  const { data, error } = await createClient()
    .from("circle_replies")
    .insert({
      post_id: postId,
      content,
      anonymous_tag: anonymousTag,
    })
    .select("id, content, anonymous_tag, created_at, edited_at")
    .single();
  if (error) throw error;
  const row = data as ReplyRow;
  return {
    id: row.id,
    content: row.content,
    timestamp: new Date(row.created_at).getTime(),
    authorTag: row.anonymous_tag,
    isAI: false,
    isOwned: true,
    editedAt: row.edited_at
      ? new Date(row.edited_at).getTime()
      : undefined,
  };
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

export async function updateForumPost(
  postId: string,
  content: string
): Promise<void> {
  const { error } = await createClient().rpc("update_circle_post", {
    p_post_id: postId,
    p_content: content,
  });
  if (error) throw error;
}

export async function updateForumReply(
  replyId: string,
  content: string
): Promise<void> {
  const { error } = await createClient().rpc("update_circle_reply", {
    p_reply_id: replyId,
    p_content: content,
  });
  if (error) throw error;
}

export async function deleteForumPost(postId: string): Promise<void> {
  const { error } = await createClient().rpc("delete_circle_post", {
    p_post_id: postId,
  });
  if (error) throw error;
}

export async function deleteForumReply(replyId: string): Promise<void> {
  const { error } = await createClient().rpc("delete_circle_reply", {
    p_reply_id: replyId,
  });
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
