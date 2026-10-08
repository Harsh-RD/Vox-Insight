"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Send, MessageSquare, Plus, Search, Sparkles, User, Bot, AlertCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { PageTransition } from "@/components/ui/motion";
import { api, ApiError, type ChatMessage, type Conversation, type Dataset, type Evidence } from "@/lib/api";

const EXAMPLE_PROMPTS = [
  "What are the biggest customer complaints?",
  "What do customers dislike most about delivery?",
  "How does our sentiment compare across datasets?",
  "Which issues are becoming more common over time?",
  "What features do customers love the most?",
];

type DisplayMessage = ChatMessage & { evidence?: Evidence[] };

function isLlmConfigError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return (
      err.code === "LLM_NOT_CONFIGURED" ||
      err.message.toLowerCase().includes("api key not found")
    );
  }
  return false;
}

function ChatContent() {
  const { workspaces } = useAuth();
  const workspace = workspaces.find((w) => w.role === "owner") ?? workspaces[0];
  const workspaceId = workspace?.id ?? "";

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [llmConfigError, setLlmConfigError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([api.listDatasets(workspaceId), api.listConversations(workspaceId)])
      .then(([ds, cs]) => {
        setDatasets(ds);
        setConversations(cs);
      })
      .catch(() => setError("Could not load conversations."))
      .finally(() => setLoadingConvs(false));
  }, [workspaceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function newConversation() {
    if (!workspaceId) return;
    setError(null);
    try {
      const conv = await api.createConversation({ workspace_id: workspaceId });
      setConversations((prev) => [conv, ...prev]);
      setConversationId(conv.id);
      setMessages([]);
    } catch {
      setError("Could not create a conversation.");
    }
  }

  async function selectConversation(id: string) {
    setError(null);
    try {
      const conv = await api.getConversation(id);
      setConversationId(id);
      setMessages(conv.messages);
    } catch {
      setError("Could not load this conversation.");
    }
  }

  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        setConversationId("");
        setMessages([]);
      }
    } catch {
      setError("Could not delete the conversation.");
    }
  }

  const handleSendMessage = useCallback(
    async (text: string, targetConvId?: string) => {
      const activeConvId = targetConvId || conversationId;
      if (!text.trim() || !activeConvId || loading) return;
      setError(null);
      setLlmConfigError(false);
      const question = text.trim();
      setContent("");

      const tempId = `pending-${messages.length + 1}`;
      const userMsg: DisplayMessage = {
        id: tempId,
        conversation_id: activeConvId,
        role: "user",
        content: question,
        provider: null,
        model: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const result = await api.sendMessage(activeConvId, {
          content: question,
          ...(selectedDatasetId ? { dataset_id: selectedDatasetId } : {}),
        });
        const assistantMsg: DisplayMessage = {
          ...result.message,
          content: result.answer,
          evidence: result.evidence,
        };
        setMessages((prev) => [...prev.filter((m) => m.id !== tempId), assistantMsg]);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        if (isLlmConfigError(err)) {
          setLlmConfigError(true);
        } else {
          setError(err instanceof ApiError ? err.message : "The assistant could not respond.");
        }
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading, messages.length, selectedDatasetId]
  );

  const handleSendOrNew = useCallback(async (text: string, targetConvId?: string) => {
    if (!text.trim() || loading) return;
    let activeConvId = targetConvId || conversationId;

    if (!activeConvId) {
      if (!workspaceId) return;
      setError(null);
      try {
        const conv = await api.createConversation({ workspace_id: workspaceId, title: text.substring(0, 40) });
        setConversations((prev) => [conv, ...prev]);
        setConversationId(conv.id);
        setMessages([]);
        activeConvId = conv.id;
      } catch {
        setError("Could not create a conversation.");
        return;
      }
    }

    await handleSendMessage(text, activeConvId);
  }, [conversationId, loading, workspaceId, handleSendMessage]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSendOrNew(content);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendOrNew(content);
    }
  }

  return (
    <div className="page-content" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 4rem)", padding: "1.5rem", maxWidth: 1400, margin: "0 auto" }}>
      <PageTransition>
        <div className="page-header" style={{ marginBottom: "1.5rem", flexShrink: 0 }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={24} color="var(--brand)" /> AI Assistant
            </h1>
            <span className="page-subtitle">Chat with your customer feedback using Retrieval-Augmented Generation.</span>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <select
              className="input"
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              aria-label="Dataset context"
              style={{ width: 250, padding: "0.5rem 1rem" }}
            >
              <option value="">Search across all datasets</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {llmConfigError && (
          <div style={{ background: "var(--warning-bg)", color: "var(--warning-fg)", padding: "1rem", borderRadius: "var(--radius)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertCircle size={20} />
            <div>
              <strong>LLM not configured.</strong> The assistant requires an LLM API key. Set <code>LLM_API_KEY</code> and <code>LLM_PROVIDER</code> in your <code>.env</code> file.
            </div>
          </div>
        )}

        {error && !llmConfigError && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", padding: "1rem", borderRadius: "var(--radius)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "1.5rem", flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <div className="card" style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", padding: "1rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={newConversation}
              disabled={!workspaceId}
              style={{ width: "100%", justifyContent: "center", marginBottom: "1.5rem" }}
            >
              <Plus size={16} /> New Chat
            </button>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem", padding: "0 0.5rem" }}>
              Recent Conversations
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {loadingConvs ? (
                <div style={{ padding: "1rem", display: "flex", justifyContent: "center" }}><div className="spinner" style={{ width: 20, height: 20 }} /></div>
              ) : conversations.length === 0 ? (
                <div style={{ color: "var(--fg-muted)", fontSize: "0.85rem", padding: "1rem", textAlign: "center" }}>No history</div>
              ) : (
                conversations.map((conv) => (
                  <div key={conv.id} style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => void selectConversation(conv.id)}
                      style={{
                        flex: 1,
                        background: conv.id === conversationId ? "var(--brand-light)" : "transparent",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        color: conv.id === conversationId ? "var(--brand)" : "var(--fg-2)",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: conv.id === conversationId ? 600 : 500,
                        padding: "0.6rem 0.75rem",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        transition: "all 0.2s"
                      }}
                    >
                      {conv.title || "Untitled Chat"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => void handleDeleteConversation(conv.id, e)}
                      title="Delete conversation"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--fg-muted)",
                        cursor: "pointer",
                        padding: "0.5rem",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "var(--danger-bg)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = "var(--fg-muted)"; e.currentTarget.style.background = "transparent"; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
              {!conversationId ? (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", alignItems: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
                    <MessageSquare size={32} />
                  </div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--fg)", fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>
                    Ask about your feedback
                  </h2>
                  <p style={{ color: "var(--fg-muted)", fontSize: "0.95rem", maxWidth: 400, textAlign: "center", marginBottom: "2.5rem" }}>
                    VoxInsight Assistant searches through your uploaded datasets to provide grounded answers with citations.
                  </p>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", width: "100%", maxWidth: 600 }}>
                    {EXAMPLE_PROMPTS.map((p, i) => (
                      <button
                        key={p}
                        className="btn btn-secondary"
                        style={{ padding: "1rem", justifyContent: "flex-start", textAlign: "left", fontSize: "0.85rem", height: "auto", whiteSpace: "normal", background: "var(--surface-2)" }}
                        onClick={async () => {
                          await handleSendOrNew(p);
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: "flex", gap: "1rem", opacity: msg.id.startsWith("pending") ? 0.6 : 1, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: msg.role === "user" ? "var(--surface-2)" : "var(--brand-light)", color: msg.role === "user" ? "var(--fg-2)" : "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${msg.role === "user" ? "var(--border)" : "var(--brand-light)"}` }}>
                          {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
                        </div>
                        <div style={{ maxWidth: "80%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fg)" }}>{msg.role === "user" ? "You" : "VoxInsight AI"}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          <div style={{
                            background: msg.role === "user" ? "var(--brand)" : "var(--surface-2)",
                            color: msg.role === "user" ? "white" : "var(--fg)",
                            padding: "1rem 1.25rem",
                            borderRadius: msg.role === "user" ? "20px 20px 0 20px" : "0 20px 20px 20px",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                            boxShadow: msg.role === "user" ? "var(--shadow-sm)" : "none",
                            border: msg.role === "user" ? "none" : "1px solid var(--border)"
                          }}>
                            {msg.content}
                          </div>

                          {msg.evidence && msg.evidence.length > 0 && (
                            <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
                              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--brand)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <Search size={14} /> Sources & Evidence ({msg.evidence.length})
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                {msg.evidence.map((ev) => (
                                  <div key={ev.feedback_id} style={{ padding: "0.75rem", background: "var(--bg)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--success-fg)", marginBottom: "0.25rem" }}>
                                      {Math.round(ev.similarity_score * 100)}% match
                                    </div>
                                    <div style={{ fontSize: "0.85rem", color: "var(--fg-2)" }}>"{ev.text}"</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: "1rem" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Bot size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fg)", marginBottom: "0.5rem" }}>VoxInsight AI</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "1rem 1.25rem", background: "var(--surface-2)", borderRadius: "0 20px 20px 20px", color: "var(--fg-muted)", fontSize: "0.9rem" }}>
                          <div className="spinner" style={{ width: 14, height: 14, borderColor: "var(--brand)", borderTopColor: "transparent" }} />
                          Analyzing data and generating answer...
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Form */}
            <div style={{ padding: "1.5rem", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  gap: "1rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-full)",
                  padding: "0.5rem 0.5rem 0.5rem 1.5rem",
                  alignItems: "center",
                  boxShadow: "var(--shadow-sm)"
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your feedback..."
                  rows={1}
                  style={{
                    border: 0,
                    flex: 1,
                    fontSize: "0.95rem",
                    outline: "none",
                    resize: "none",
                    background: "transparent",
                    color: "var(--fg)",
                    maxHeight: 120,
                    paddingTop: "0.6rem"
                  }}
                />
                <button
                  type="submit"
                  disabled={!content.trim() || loading}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: (!content.trim() || loading) ? "var(--border)" : "var(--brand)",
                    color: "white",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: (!content.trim() || loading) ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    flexShrink: 0
                  }}
                >
                  <Send size={18} style={{ marginLeft: "2px" }} />
                </button>
              </form>
              <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--fg-muted)", marginTop: "0.75rem" }}>
                AI can make mistakes. Verify important insights from the source data.
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <AppShell>
        <ChatContent />
      </AppShell>
    </AuthGuard>
  );
}
