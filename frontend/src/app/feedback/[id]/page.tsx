"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Clock, Globe, ShieldAlert, Cpu } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { PageTransition, FadeIn } from "@/components/ui/motion";
import { SentimentBadge } from "@/components/ui/sentiment-badge";
import { api, type Feedback } from "@/lib/api";

type AnalysisResult = any;

function FeedbackDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    // In a real app we'd fetch the feedback by ID, but since there is no public
    // api.ts method for getFeedbackById yet, we'll fetch via direct fetch.
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/v1/feedback/${id}`);
        if (!res.ok) throw new Error("Failed to load feedback");
        const data = await res.json();
        setFeedback(data.data);
        
        const anRes = await fetch(`/api/v1/feedback/${id}/analysis`);
        if (anRes.ok) {
          const anData = await anRes.json();
          setAnalysis(anData.data.analysis);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="page-content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div className="animate-spin"><Cpu size={32} color="var(--brand)" /></div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="page-content">
        <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", padding: "1rem", borderRadius: "var(--radius)" }}>
          {error || "Feedback not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageTransition>
        <button 
          onClick={() => router.back()} 
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "transparent", border: "none", color: "var(--fg-muted)", cursor: "pointer", marginBottom: "1.5rem", fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="page-header" style={{ marginBottom: "2rem" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MessageSquare size={24} color="var(--brand)" /> Feedback Detail
            </h1>
            <p className="page-subtitle">ID: {feedback.id}</p>
          </div>
        </div>

        <div className="bento-grid">
          {/* Main Feedback Content */}
          <FadeIn className="bento-col-8">
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="card-header">
                <div className="card-title">Original Text</div>
              </div>
              <div style={{ padding: "1.5rem", fontSize: "1.1rem", lineHeight: 1.6, color: "var(--fg)", background: "var(--surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", flex: 1 }}>
                "{feedback.original_text}"
              </div>
              
              <div style={{ display: "flex", gap: "2rem", marginTop: "1.5rem", padding: "1.5rem 0 0 0", borderTop: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Source</div>
                  <div style={{ fontWeight: 500, color: "var(--fg)" }}>{feedback.source || "Unknown"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Rating</div>
                  <div style={{ fontWeight: 500, color: "var(--fg)" }}>{feedback.rating ? `${feedback.rating} / 5` : "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Date</div>
                  <div style={{ fontWeight: 500, color: "var(--fg)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Clock size={14} />
                    {feedback.timestamp ? new Date(feedback.timestamp).toLocaleString() : "Unknown"}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* NLP Analysis Side Panel */}
          <FadeIn className="bento-col-4" delay={0.1}>
            <div className="card" style={{ height: "100%" }}>
              <div className="card-header">
                <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Cpu size={18} color="var(--brand)" /> AI Analysis
                </div>
              </div>
              
              {!analysis ? (
                <div className="empty-state" style={{ minHeight: "200px" }}>
                  <div className="empty-description">No analysis available.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Overall Sentiment</div>
                    <SentimentBadge sentiment={analysis.sentiment_label as any} />
                    {analysis.sentiment_score && (
                      <span style={{ fontSize: "0.8rem", color: "var(--fg-muted)", marginLeft: "0.75rem" }}>
                        Confidence: {(analysis.sentiment_score * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  
                  <div style={{ height: 1, background: "var(--border)" }} />
                  
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Emotion</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 600, color: "var(--fg)", textTransform: "capitalize" }}>{analysis.emotion_label || "Neutral"}</span>
                    </div>
                  </div>
                  
                  <div style={{ height: 1, background: "var(--border)" }} />
                  
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Language Details</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>Detected</div>
                        <div style={{ fontWeight: 500, color: "var(--fg)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Globe size={12} /> {analysis.language || "Unknown"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>Code-Mixed</div>
                        <div style={{ fontWeight: 500, color: "var(--fg)" }}>{analysis.is_code_mixed ? "Yes" : "No"}</div>
                      </div>
                    </div>
                  </div>
                  
                  {analysis.complaint_label === "complaint" && (
                    <>
                      <div style={{ height: 1, background: "var(--border)" }} />
                      <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", padding: "1rem", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Complaint Detected</div>
                          <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>This feedback has been flagged as a potential complaint or issue requiring attention.</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </FadeIn>
          
          {/* Extracted Aspects */}
          {analysis?.aspects && analysis.aspects.length > 0 && (
            <FadeIn className="bento-col-12" delay={0.2}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Extracted Aspects</div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
                  {analysis.aspects.map((aspect: any) => (
                    <div key={aspect.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "var(--surface-2)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                      <span style={{ fontWeight: 600, color: "var(--fg)" }}>{aspect.aspect_term}</span>
                      <SentimentBadge sentiment={aspect.sentiment_label as any} />
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          )}
        </div>
      </PageTransition>
    </div>
  );
}

export default function FeedbackDetailPage() {
  return (
    <AuthGuard>
      <AppShell>
        <FeedbackDetailContent />
      </AppShell>
    </AuthGuard>
  );
}
