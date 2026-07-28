"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Heart, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  createPost,
  createReply,
  detectCrisis,
  formatTimeAgo,
  getCircleTopics,
  getForumFeed,
  togglePostLike,
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
                    <div>
                      <span>{post.authorTag}</span>
                      <span>{post.careStage}</span>
                    </div>
                    <time>{formatTimeAgo(post.timestamp)}</time>
                  </div>

                  <p className="circle-post-copy">{post.content}</p>
                  {post.hasCrisis && CRISIS_RESOURCES}

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
                            <time>{formatTimeAgo(reply.timestamp)}</time>
                          </div>
                          <p>{reply.content}</p>
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
    </main>
  );
}
