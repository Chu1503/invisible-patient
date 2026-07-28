"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Heart, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  CARE_STAGES,
  createPost,
  createReply,
  detectCrisis,
  formatTimeAgo,
  getMyStage,
  getPosts,
  saveMyStage,
  savePosts,
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
  const [myStage, setMyStage] = useState(CARE_STAGES[0]);
  const [newPost, setNewPost] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  useEffect(() => {
    setPosts(getPosts());
    setMyStage(getMyStage());
  }, []);

  function submitPost() {
    if (!newPost.trim()) return;
    const post = createPost(newPost.trim(), myStage);
    const updated = [post, ...posts];
    setPosts(updated);
    savePosts(updated);
    setNewPost("");
    setExpandedPost(post.id);
    if (post.hasCrisis) {
      getAIReply(post.id, post.content, updated);
    }
  }

  function submitReply(postId: string) {
    if (!replyText.trim()) return;
    const submittedText = replyText.trim();
    const reply = createReply(submittedText);
    const updated = posts.map((post) =>
      post.id === postId
        ? { ...post, replies: [...post.replies, reply] }
        : post
    );
    setPosts(updated);
    savePosts(updated);
    setReplyText("");
    setReplyingTo(null);
    if (detectCrisis(submittedText)) {
      getAIReply(postId, submittedText, updated);
    }
  }

  async function getAIReply(
    postId: string,
    triggerText: string,
    currentPosts: ForumPost[]
  ) {
    setAiLoading(postId);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: triggerText }],
          context: { riskLevel: "crisis", zbiAnswers: [], dominantThemes: [] },
        }),
      });
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
      }
      const aiReply = createReply(full.trim(), true);
      const updated = currentPosts.map((post) =>
        post.id === postId
          ? { ...post, replies: [...post.replies, aiReply] }
          : post
      );
      setPosts(updated);
      savePosts(updated);
    } finally {
      setAiLoading(null);
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

        <div className="circle-summary">
          Community preview. Sample conversations and anything you add stay on
          this browser while moderated community access is being prepared.
        </div>

        <section className="circle-timeline">
          <div className="circle-composer">
            <div className="circle-stage-control">
              <button
                onClick={() => setStagePickerOpen((open) => !open)}
                className="circle-stage-button"
                type="button"
                aria-expanded={stagePickerOpen}
              >
                <span>{myStage}</span>
                <ChevronDown
                  size={14}
                  className={stagePickerOpen ? "is-open" : ""}
                />
              </button>

              {stagePickerOpen && (
                <div className="circle-stage-picker">
                  {CARE_STAGES.map((stage) => (
                    <button
                      key={stage}
                      onClick={() => {
                        saveMyStage(stage);
                        setMyStage(stage);
                        setStagePickerOpen(false);
                      }}
                      className={myStage === stage ? "is-selected" : ""}
                      type="button"
                    >
                      <span>{stage}</span>
                      {myStage === stage && <Check size={13} />}
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
                disabled={!newPost.trim()}
                className="circle-share-button"
                type="button"
              >
                Add to preview
              </button>
            </div>
          </div>

          <div className="circle-feed ip-connected-list">
            {posts.map((post) => {
              const isExpanded = expandedPost === post.id;

              return (
                <article key={post.id} className="circle-post">
                  <div className="circle-post-meta">
                    <span>{post.careStage}</span>
                    <span>{formatTimeAgo(post.timestamp)}</span>
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
                    <button type="button" aria-label="Like post">
                      <Heart size={16} />
                      <span>0</span>
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
                          <span>{formatTimeAgo(reply.timestamp)}</span>
                          <p>{reply.content}</p>
                        </div>
                      ))}

                      {aiLoading === post.id && (
                        <div
                          className="circle-reply-loading"
                          aria-label="Preparing support response"
                        >
                          <span />
                          <span />
                          <span />
                        </div>
                      )}

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
                              disabled={!replyText.trim()}
                              className="circle-share-button"
                              type="button"
                            >
                              Post response
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
