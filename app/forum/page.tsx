"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Heart,
  MessageCircle,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  createPost,
  createReply,
  deleteForumPost,
  deleteForumReply,
  detectCrisis,
  formatTimeAgo,
  getCircleTopics,
  getForumFeed,
  togglePostLike,
  updateForumPost,
  updateForumReply,
  type ForumPost,
} from "@/lib/forum";

const CRISIS_RESOURCES = (
  <div className="mt-3 rounded-xl border border-[#8B5A5A]/30 bg-[#1A0D0D] p-3 text-xs leading-relaxed text-[#D4CEBD]">
    If you or someone is in immediate danger, please reach out:
    <br />
    <a href="tel:988" className="text-[#B2AC88] hover:underline">
      988
    </a>
    , Suicide & Crisis Lifeline{" "}
    <a href="tel:18552273640" className="text-[#B2AC88] hover:underline">
      1-855-227-3640
    </a>
    , Caregiver Crisis Line
  </div>
);

type EditingItem = {
  kind: "post" | "reply";
  id: string;
};

export default function ForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [newPost, setNewPost] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editText, setEditText] = useState("");
  const [workingItem, setWorkingItem] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EditingItem | null>(null);

  useEffect(() => {
    const availableTopics = getCircleTopics();
    setTopics(availableTopics);
    setSelectedTopic(availableTopics[0] ?? "");
  }, []);

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const feed = await getForumFeed();
      setPosts(feed.posts);
      setLikedPostIds(feed.likedPostIds);
      setFeedError("");
    } catch {
      setFeedError("The Circle could not refresh. Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadFeed(true);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loadFeed]);

  useEffect(() => {
    if (!deleteTarget) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !workingItem) setDeleteTarget(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [deleteTarget, workingItem]);

  async function submitPost() {
    if (!newPost.trim() || !selectedTopic || submitting) return;
    setSubmitting(true);
    try {
      await createPost(newPost.trim(), selectedTopic);
      setNewPost("");
      await loadFeed(true);
    } catch {
      setFeedError("Your post could not be shared. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply(postId: string) {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createReply(postId, replyText.trim());
      setReplyText("");
      setReplyingTo(null);
      setExpandedPost(postId);
      await loadFeed(true);
    } catch {
      setFeedError("Your response could not be shared. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(post: ForumPost) {
    const currentlyLiked = likedPostIds.has(post.id);
    setLikedPostIds((current) => {
      const next = new Set(current);
      if (currentlyLiked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              likes: Math.max(0, item.likes + (currentlyLiked ? -1 : 1)),
            }
          : item
      )
    );

    try {
      await togglePostLike(post.id, currentlyLiked);
    } catch {
      setFeedError("That reaction could not be saved.");
      await loadFeed(true);
    }
  }

  function beginEditing(
    kind: EditingItem["kind"],
    id: string,
    content: string
  ) {
    setEditingItem({ kind, id });
    setEditText(content);
    setReplyingTo(null);
    setFeedError("");
  }

  async function saveEdit() {
    if (!editingItem || !editText.trim() || workingItem) return;
    const key = `edit-${editingItem.kind}-${editingItem.id}`;
    setWorkingItem(key);
    try {
      if (editingItem.kind === "post") {
        await updateForumPost(editingItem.id, editText.trim());
      } else {
        await updateForumReply(editingItem.id, editText.trim());
      }
      setEditingItem(null);
      setEditText("");
      await loadFeed(true);
    } catch {
      setFeedError("Your changes could not be saved. Please try again.");
    } finally {
      setWorkingItem("");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || workingItem) return;
    const { kind, id } = deleteTarget;

    const key = `delete-${kind}-${id}`;
    setWorkingItem(key);
    try {
      if (kind === "post") {
        await deleteForumPost(id);
        if (expandedPost === id) setExpandedPost(null);
      } else {
        await deleteForumReply(id);
      }
      if (editingItem?.id === id) {
        setEditingItem(null);
        setEditText("");
      }
      setDeleteTarget(null);
      await loadFeed(true);
    } catch {
      setFeedError(
        kind === "post"
          ? "This post could not be deleted."
          : "This response could not be deleted."
      );
    } finally {
      setWorkingItem("");
    }
  }

  return (
    <main className="min-h-screen bg-[#090d15] px-4 pb-16 pt-24">
      <Navbar />
      <div className="mx-auto max-w-4xl">
        <header
          className="mb-8"
          style={{ animation: "fadeUp 0.6s ease-out forwards", opacity: 0 }}
        >
          <h1 className="text-4xl font-semibold tracking-tight text-[#F5F0E8]">
            The Circle
          </h1>
        </header>

        <section className="circle-timeline">
          <div className="circle-composer">
            <div className="circle-stage-control">
              <button
                onClick={() => setStagePickerOpen((open) => !open)}
                className="circle-stage-button"
                type="button"
                aria-expanded={stagePickerOpen}
              >
                <span>{selectedTopic || "Choose a topic"}</span>
                <ChevronDown
                  size={14}
                  className={stagePickerOpen ? "is-open" : ""}
                />
              </button>

              {stagePickerOpen && (
                <div className="circle-stage-picker">
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => {
                        setSelectedTopic(topic);
                        setStagePickerOpen(false);
                      }}
                      className={selectedTopic === topic ? "is-selected" : ""}
                      type="button"
                    >
                      <span>{topic}</span>
                      {selectedTopic === topic && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea
              value={newPost}
              maxLength={2000}
              onChange={(event) => setNewPost(event.target.value)}
              placeholder="Share what is on your mind"
              rows={3}
              className="circle-textarea"
            />

            {detectCrisis(newPost) && CRISIS_RESOURCES}

            <div className="mt-3 flex justify-end">
              <button
                onClick={submitPost}
                disabled={!newPost.trim() || !selectedTopic || submitting}
                className="circle-share-button"
                type="button"
              >
                {submitting ? "Posting" : "Post anonymously"}
              </button>
            </div>
          </div>

          {feedError && (
            <div className="circle-feed-message" role="status">
              <span>{feedError}</span>
              <button type="button" onClick={() => void loadFeed()}>
                Try again
              </button>
            </div>
          )}

          <div className="circle-feed ip-connected-list">
            {loading && (
              <div className="circle-feed-loading" aria-label="Loading the Circle">
                <span />
                <span />
                <span />
              </div>
            )}

            {!loading && !posts.length && (
              <div className="circle-empty">
                <h2>Start the conversation</h2>
                <p>Share a question, a hard moment, or something that helped.</p>
              </div>
            )}

            {posts.map((post) => {
              const isExpanded = expandedPost === post.id;
              const isLiked = likedPostIds.has(post.id);

              return (
                <article key={post.id} className="circle-post">
                  <div className="circle-post-meta">
                    <div className="circle-post-author">
                      <span>{post.authorTag}</span>
                      <span>{post.careStage}</span>
                    </div>
                    <div className="circle-post-controls">
                      <div className="circle-time-meta">
                        <time>{formatTimeAgo(post.timestamp)}</time>
                        {post.editedAt && <span>Edited</span>}
                      </div>
                      {post.isOwned && (
                        <div className="circle-owner-actions">
                          <button
                            type="button"
                            aria-label="Edit post"
                            disabled={Boolean(workingItem)}
                            onClick={() =>
                              beginEditing("post", post.id, post.content)
                            }
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete post"
                            disabled={Boolean(workingItem)}
                            onClick={() =>
                              setDeleteTarget({ kind: "post", id: post.id })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {editingItem?.kind === "post" &&
                  editingItem.id === post.id ? (
                    <CircleEditComposer
                      value={editText}
                      saving={workingItem === `edit-post-${post.id}`}
                      onChange={setEditText}
                      onCancel={() => {
                        setEditingItem(null);
                        setEditText("");
                      }}
                      onSave={() => void saveEdit()}
                    />
                  ) : (
                    <>
                      <p className="circle-post-copy">{post.content}</p>
                      {post.hasCrisis && CRISIS_RESOURCES}
                    </>
                  )}

                  <div className="circle-actions">
                    <button
                      onClick={() => {
                        setExpandedPost(isExpanded ? null : post.id);
                        setReplyingTo(null);
                      }}
                      type="button"
                      aria-label={isExpanded ? "Hide responses" : "Show responses"}
                    >
                      <MessageCircle size={16} />
                      <span>{post.replies.length}</span>
                    </button>
                    <button
                      className={isLiked ? "is-liked" : ""}
                      type="button"
                      aria-label={isLiked ? "Remove reaction" : "Support post"}
                      onClick={() => void toggleLike(post)}
                    >
                      <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                      <span>{post.likes}</span>
                    </button>
                    <button
                      onClick={() => {
                        setExpandedPost(post.id);
                        setReplyingTo(post.id);
                      }}
                      type="button"
                    >
                      Respond
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="circle-replies">
                      {post.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={reply.isAI ? "is-support" : ""}
                        >
                          <div className="circle-reply-meta">
                            <span>{reply.authorTag}</span>
                            <div className="circle-reply-controls">
                              <div className="circle-time-meta">
                                <time>{formatTimeAgo(reply.timestamp)}</time>
                                {reply.editedAt && <span>Edited</span>}
                              </div>
                              {reply.isOwned && (
                                <div className="circle-owner-actions">
                                  <button
                                    type="button"
                                    aria-label="Edit response"
                                    disabled={Boolean(workingItem)}
                                    onClick={() =>
                                      beginEditing(
                                        "reply",
                                        reply.id,
                                        reply.content
                                      )
                                    }
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Delete response"
                                    disabled={Boolean(workingItem)}
                                    onClick={() =>
                                      setDeleteTarget({
                                        kind: "reply",
                                        id: reply.id,
                                      })
                                    }
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {editingItem?.kind === "reply" &&
                          editingItem.id === reply.id ? (
                            <CircleEditComposer
                              value={editText}
                              saving={
                                workingItem === `edit-reply-${reply.id}`
                              }
                              compact
                              onChange={setEditText}
                              onCancel={() => {
                                setEditingItem(null);
                                setEditText("");
                              }}
                              onSave={() => void saveEdit()}
                            />
                          ) : (
                            <p>{reply.content}</p>
                          )}
                        </div>
                      ))}

                      {replyingTo === post.id && (
                        <div className="circle-reply-composer">
                          <textarea
                            value={replyText}
                            maxLength={2000}
                            onChange={(event) => setReplyText(event.target.value)}
                            placeholder="Write a response"
                            rows={2}
                          />
                          {detectCrisis(replyText) && CRISIS_RESOURCES}
                          <div>
                            <button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText("");
                              }}
                              type="button"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => submitReply(post.id)}
                              disabled={!replyText.trim() || submitting}
                              className="circle-share-button"
                              type="button"
                            >
                              {submitting ? "Posting" : "Post response"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {deleteTarget && (
        <div
          className="circle-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !workingItem) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            className="circle-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="circle-delete-title"
            aria-describedby="circle-delete-description"
          >
            <h2 id="circle-delete-title">
              Delete {deleteTarget.kind === "post" ? "post" : "response"}?
            </h2>
            <p id="circle-delete-description">
              {deleteTarget.kind === "post"
                ? "This will permanently remove the post, its responses, and its reactions."
                : "This response will be permanently removed."}
            </p>
            <div>
              <button
                type="button"
                autoFocus
                disabled={Boolean(workingItem)}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(workingItem)}
                onClick={() => void confirmDelete()}
              >
                <Trash2 size={14} />
                {workingItem ? "Deleting" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CircleEditComposer({
  value,
  saving,
  compact = false,
  onChange,
  onCancel,
  onSave,
}: {
  value: string;
  saving: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className={`circle-edit-composer ${compact ? "is-compact" : ""}`}>
      <textarea
        value={value}
        maxLength={2000}
        rows={compact ? 2 : 3}
        aria-label={compact ? "Edit response" : "Edit post"}
        onChange={(event) => onChange(event.target.value)}
      />
      {detectCrisis(value) && CRISIS_RESOURCES}
      <div className="circle-edit-actions">
        <button type="button" onClick={onCancel} disabled={saving}>
          <X size={14} />
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!value.trim() || saving}
        >
          <Save size={14} />
          {saving ? "Saving" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
