"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [currentUserTag, setCurrentUserTag] = useState("");
  const mutationCount = useRef(0);
  const mutationVersion = useRef(0);
  const pendingLikes = useRef(new Set<string>());

  useEffect(() => {
    const availableTopics = getCircleTopics();
    setTopics(availableTopics);
    setSelectedTopic(availableTopics[0] ?? "");
  }, []);

  const loadFeed = useCallback(async (silent = false) => {
    const requestedAtVersion = mutationVersion.current;
    if (!silent) setLoading(true);
    try {
      const feed = await getForumFeed();
      if (requestedAtVersion !== mutationVersion.current) return;
      setPosts(feed.posts);
      setLikedPostIds(feed.likedPostIds);
      setCurrentUserTag(feed.currentUserTag);
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
      if (
        document.visibilityState === "visible" &&
        mutationCount.current === 0
      ) {
        void loadFeed(true);
      }
    }, 30_000);
    const refreshOnFocus = () => {
      if (mutationCount.current === 0) void loadFeed(true);
    };
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
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
    const content = newPost.trim();
    const temporaryId = `pending-post-${Date.now()}`;
    const pendingPost: ForumPost = {
      id: temporaryId,
      content,
      timestamp: Date.now(),
      authorTag: currentUserTag || "Posting anonymously",
      careStage: selectedTopic,
      replies: [],
      hasCrisis: detectCrisis(content),
      likes: 0,
      isOwned: true,
      isPending: true,
    };
    mutationVersion.current += 1;
    mutationCount.current += 1;
    setSubmitting(true);
    setNewPost("");
    setPosts((current) => [pendingPost, ...current]);
    try {
      const created = await createPost(
        content,
        selectedTopic,
        currentUserTag || undefined
      );
      setPosts((current) => {
        if (current.some((post) => post.id === temporaryId)) {
          return current.map((post) =>
            post.id === temporaryId ? created : post
          );
        }
        return current.some((post) => post.id === created.id)
          ? current
          : [created, ...current];
      });
      setFeedError("");
    } catch {
      setPosts((current) =>
        current.filter((post) => post.id !== temporaryId)
      );
      setNewPost((current) => current || content);
      setFeedError("Your post could not be shared. Please try again.");
    } finally {
      mutationCount.current = Math.max(0, mutationCount.current - 1);
      setSubmitting(false);
    }
  }

  async function submitReply(postId: string) {
    if (!replyText.trim() || submitting) return;
    const content = replyText.trim();
    const temporaryId = `pending-reply-${Date.now()}`;
    const pendingReply = {
      id: temporaryId,
      content,
      timestamp: Date.now(),
      authorTag: currentUserTag || "Posting anonymously",
      isAI: false,
      isOwned: true,
      isPending: true,
    };
    mutationVersion.current += 1;
    mutationCount.current += 1;
    setSubmitting(true);
    setReplyText("");
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, replies: [...post.replies, pendingReply] }
          : post
      )
    );
    try {
      const created = await createReply(
        postId,
        content,
        currentUserTag || undefined
      );
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                replies: post.replies.some(
                  (reply) => reply.id === temporaryId
                )
                  ? post.replies.map((reply) =>
                      reply.id === temporaryId ? created : reply
                    )
                  : post.replies.some((reply) => reply.id === created.id)
                    ? post.replies
                    : [...post.replies, created],
              }
            : post
        )
      );
      setReplyingTo(null);
      setExpandedPost(postId);
      setFeedError("");
    } catch {
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                replies: post.replies.filter(
                  (reply) => reply.id !== temporaryId
                ),
              }
            : post
        )
      );
      setReplyText((current) => current || content);
      setFeedError("Your response could not be shared. Please try again.");
    } finally {
      mutationCount.current = Math.max(0, mutationCount.current - 1);
      setSubmitting(false);
    }
  }

  async function toggleLike(post: ForumPost) {
    if (pendingLikes.current.has(post.id)) return;
    pendingLikes.current.add(post.id);
    const currentlyLiked = likedPostIds.has(post.id);
    mutationVersion.current += 1;
    mutationCount.current += 1;
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
      setLikedPostIds((current) => {
        const next = new Set(current);
        if (currentlyLiked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                likes: Math.max(
                  0,
                  item.likes + (currentlyLiked ? 1 : -1)
                ),
              }
            : item
        )
      );
      setFeedError("That reaction could not be saved.");
    } finally {
      pendingLikes.current.delete(post.id);
      mutationCount.current = Math.max(0, mutationCount.current - 1);
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
    const editing = editingItem;
    const updatedContent = editText.trim();
    const originalPost =
      editing.kind === "post"
        ? posts.find((post) => post.id === editing.id)
        : undefined;
    const originalReply =
      editing.kind === "reply"
        ? posts
            .flatMap((post) => post.replies)
            .find((reply) => reply.id === editing.id)
        : undefined;
    const editedAt = Date.now();
    mutationVersion.current += 1;
    mutationCount.current += 1;
    setWorkingItem(key);
    setPosts((current) =>
      current.map((post) => {
        if (editing.kind === "post" && post.id === editing.id) {
          return {
            ...post,
            content: updatedContent,
            hasCrisis: detectCrisis(updatedContent),
            editedAt,
          };
        }
        if (editing.kind === "reply") {
          return {
            ...post,
            replies: post.replies.map((reply) =>
              reply.id === editing.id
                ? { ...reply, content: updatedContent, editedAt }
                : reply
            ),
          };
        }
        return post;
      })
    );
    setEditingItem(null);
    try {
      if (editing.kind === "post") {
        await updateForumPost(editing.id, updatedContent);
      } else {
        await updateForumReply(editing.id, updatedContent);
      }
      setEditText("");
      setFeedError("");
    } catch {
      setPosts((current) =>
        current.map((post) => {
          if (originalPost && post.id === originalPost.id) {
            return originalPost;
          }
          if (originalReply) {
            return {
              ...post,
              replies: post.replies.map((reply) =>
                reply.id === originalReply.id ? originalReply : reply
              ),
            };
          }
          return post;
        })
      );
      setEditingItem(editing);
      setFeedError("Your changes could not be saved. Please try again.");
    } finally {
      mutationCount.current = Math.max(0, mutationCount.current - 1);
      setWorkingItem("");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || workingItem) return;
    const { kind, id } = deleteTarget;
    const deletedPostIndex = posts.findIndex((post) => post.id === id);
    const deletedPost =
      kind === "post" && deletedPostIndex >= 0
        ? posts[deletedPostIndex]
        : undefined;
    const replyParent = posts.find((post) =>
      post.replies.some((reply) => reply.id === id)
    );
    const deletedReplyIndex =
      replyParent?.replies.findIndex((reply) => reply.id === id) ?? -1;
    const deletedReply =
      kind === "reply" && deletedReplyIndex >= 0
        ? replyParent?.replies[deletedReplyIndex]
        : undefined;
    const wasLiked = likedPostIds.has(id);
    const wasExpanded = expandedPost === id;
    const key = `delete-${kind}-${id}`;
    mutationVersion.current += 1;
    mutationCount.current += 1;
    setWorkingItem(key);
    if (kind === "post") {
      setPosts((current) => current.filter((post) => post.id !== id));
      setLikedPostIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      if (expandedPost === id) setExpandedPost(null);
    } else {
      setPosts((current) =>
        current.map((post) => ({
          ...post,
          replies: post.replies.filter((reply) => reply.id !== id),
        }))
      );
    }
    setDeleteTarget(null);
    try {
      if (kind === "post") {
        await deleteForumPost(id);
      } else {
        await deleteForumReply(id);
      }
      if (editingItem?.id === id) {
        setEditingItem(null);
        setEditText("");
      }
      setFeedError("");
    } catch {
      setPosts((current) => {
        if (deletedPost && !current.some((post) => post.id === id)) {
          const next = [...current];
          next.splice(Math.min(deletedPostIndex, next.length), 0, deletedPost);
          return next;
        }
        if (replyParent && deletedReply) {
          return current.map((post) => {
            if (
              post.id !== replyParent.id ||
              post.replies.some((reply) => reply.id === id)
            ) {
              return post;
            }
            const replies = [...post.replies];
            replies.splice(
              Math.min(deletedReplyIndex, replies.length),
              0,
              deletedReply
            );
            return { ...post, replies };
          });
        }
        return current;
      });
      if (wasLiked) {
        setLikedPostIds((current) => new Set(current).add(id));
      }
      if (wasExpanded) setExpandedPost(id);
      setDeleteTarget({ kind, id });
      setFeedError(
        kind === "post"
          ? "This post could not be deleted."
          : "This response could not be deleted."
      );
    } finally {
      mutationCount.current = Math.max(0, mutationCount.current - 1);
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
                        <time>
                          {post.isPending
                            ? "Posting"
                            : formatTimeAgo(post.timestamp)}
                        </time>
                        {post.editedAt && <span>Edited</span>}
                      </div>
                      {post.isOwned && !post.isPending && (
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
                      disabled={post.isPending}
                      aria-label={isExpanded ? "Hide responses" : "Show responses"}
                    >
                      <MessageCircle size={16} />
                      <span>{post.replies.length}</span>
                    </button>
                    <button
                      className={isLiked ? "is-liked" : ""}
                      type="button"
                      aria-label={isLiked ? "Remove reaction" : "Support post"}
                      disabled={post.isPending}
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
                      disabled={post.isPending}
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
                                <time>
                                  {reply.isPending
                                    ? "Posting"
                                    : formatTimeAgo(reply.timestamp)}
                                </time>
                                {reply.editedAt && <span>Edited</span>}
                              </div>
                              {reply.isOwned && !reply.isPending && (
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
