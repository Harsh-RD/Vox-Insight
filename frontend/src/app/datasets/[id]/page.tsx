"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BarChart3, RefreshCw, Cpu, Database, Search, TrendingUp, AlertTriangle, Smile, Sparkles } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/motion";
import { SentimentBadge, StatusBadge } from "@/components/ui/sentiment-badge";
import {
  api,
  ApiError,
  type Dataset,
  type Feedback,
  type VectorIndexStatus,
  type OverviewAnalytics,
} from "@/lib/api";

const ANALYSIS_STAGES = [
  "Initializing NLP pipeline...",
  "Extracting sentiment...",
  "Detecting customer emotions...",
  "Identifying complaints...",
  "Finding key aspects...",
  "Finalizing insights...",
];

function DatasetDetailContent() {
  const params = useParams();
  const datasetId = params.id as string;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [indexStatus, setIndexStatus] = useState<VectorIndexStatus | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<{
    status: string;
    analyzed_count: number;
    pending_count: number;
    failed_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  // Progressive loader effect
  useEffect(() => {
    if (analyzing) {
      const interval = setInterval(() => {
        setStageIndex((prev) => (prev + 1) % ANALYSIS_STAGES.length);
      }, 2500);
      return () => clearInterval(interval);
    } else {
      setStageIndex(0);
    }
  }, [analyzing]);

  // Fetch insights when analysis is done
  useEffect(() => {
    if (dataset && analysisStatus && analysisStatus.analyzed_count > 0 && !analyzing) {
      setLoadingOverview(true);
      api.getOverviewAnalytics(dataset.workspace_id, datasetId)
        .then(setOverview)
        .catch(console.error)
        .finally(() => setLoadingOverview(false));
    }
  }, [dataset, analysisStatus?.analyzed_count, analyzing, datasetId]);

  useEffect(() => {
    if (!datasetId) return;
    setLoading(true);
    Promise.all([
      api.getDataset(datasetId),
      api.listDatasetFeedback(datasetId, 100, 0),
      api.getDatasetIndexStatus(datasetId).catch(() => null),
      api.getDatasetAnalysisStatus(datasetId).catch(() => null),
    ])
      .then(([ds, fb, idx, as_]) => {
        setDataset(ds);
        setFeedback(fb);
        setIndexStatus(idx);
        setAnalysisStatus(as_);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dataset."))
      .finally(() => setLoading(false));
  }, [datasetId]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      await api.analyzeDataset(datasetId);
      const [st, fb] = await Promise.all([
        api.getDatasetAnalysisStatus(datasetId),
        api.listDatasetFeedback(datasetId, 100, 0),
      ]);
      setAnalysisStatus(st);
      setFeedback(fb);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Analysis failed. Check the backend logs.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleBuildIndex() {
    setBuilding(true);
    setError(null);
    try {
      const idx = await api.buildDatasetIndex(datasetId);
      setIndexStatus(idx);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Index build failed.");
    } finally {
      setBuilding(false);
    }
  }

  if (loading) {
    return <div className="page-content" style={{ display: "flex", justifyContent: "center", paddingTop: "5rem" }}><div className="spinner spinner-lg" /></div>;
  }

  if (!dataset) {
    return (
      <div className="page-content">
        <div style={{ padding: "1.5rem", background: "var(--danger-bg)", color: "var(--danger-fg)", border: "1px solid var(--danger-border)", borderRadius: "var(--radius-md)" }}>
          Dataset not found.
        </div>
      </div>
    );
  }

  const analysisPct = analysisStatus && dataset.row_count > 0
    ? ((analysisStatus.analyzed_count / dataset.row_count) * 100).toFixed(1)
    : null;

  return (
    <div className="page-content">
      <PageTransition>
        <Link href="/datasets" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--fg-muted)", textDecoration: "none", marginBottom: "1.5rem", fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Datasets
        </Link>
        
        <div className="page-header" style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Database size={24} color="var(--brand)" /> {dataset.name}
            </h1>
            <p className="page-subtitle" style={{ marginTop: "0.5rem" }}>
              {dataset.row_count.toLocaleString()} rows · Created {new Date(dataset.created_at).toLocaleDateString()}
              {dataset.original_filename && ` · File: ${dataset.original_filename}`}
            </p>
          </div>
          <div>
            <StatusBadge status={dataset.status} />
          </div>
        </div>

        {error && (
          <div style={{ padding: "1.25rem", background: "var(--danger-bg)", color: "var(--danger-fg)", border: "1px solid var(--danger-border)", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", fontWeight: 500 }}>
            {error}
          </div>
        )}

        <StaggerContainer className="bento-grid-3" style={{ marginBottom: "2rem" }}>
          {/* Analysis Status */}
          <FadeIn>
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="card-header" style={{ borderBottom: "none", paddingBottom: "0.5rem" }}>
                <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Cpu size={18} color="var(--brand)" /> NLP Pipeline
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleAnalyze} disabled={analyzing || (analysisStatus?.analyzed_count === dataset?.row_count && dataset?.row_count > 0)} style={{ padding: "0.4rem 0.75rem" }}>
                  {analyzing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><BarChart3 size={14} /> Run Analysis</>}
                </button>
              </div>
              
              <div style={{ padding: "0 1.5rem 1.5rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                {analysisStatus ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--fg-2)", marginBottom: "0.75rem", fontWeight: 500 }}>
                      <span>Analyzed: {analysisStatus.analyzed_count}</span>
                      <span>Pending: {analysisStatus.pending_count}</span>
                    </div>
                    {analysisPct && (
                      <div>
                        <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{ width: `${analysisPct}%`, height: "100%", background: "var(--brand)", transition: "width 0.5s ease-out" }} />
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", marginTop: "0.5rem", fontWeight: 600 }}>{analysisPct}% Complete</div>
                      </div>
                    )}
                    {analyzing && (
                      <div style={{ marginTop: "1rem", textAlign: "center", color: "var(--brand)", fontWeight: 600, fontSize: "0.85rem", animation: "pulse 2s infinite" }}>
                        {ANALYSIS_STAGES[stageIndex]}
                      </div>
                    )}
                    
                    {!analyzing && analysisStatus.analyzed_count > 0 && (
                      <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ padding: "1rem", background: "var(--brand-light)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                          <div style={{ fontWeight: 700, color: "var(--brand)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Sparkles size={16} /> Analysis Complete</div>
                          {loadingOverview ? (
                            <div style={{ fontSize: "0.85rem", color: "var(--brand)" }}>Loading insights...</div>
                          ) : overview ? (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.85rem" }}>
                              <div>
                                <div style={{ color: "var(--fg-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Sentiment</div>
                                <div style={{ fontWeight: 800, color: "var(--success-fg)" }}><TrendingUp size={12} style={{ display: "inline", marginRight: 4 }} /> {((overview.positive_count / Math.max(overview.analyzed_feedback, 1)) * 100).toFixed(0)}% Positive</div>
                              </div>
                              <div>
                                <div style={{ color: "var(--fg-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Complaints</div>
                                <div style={{ fontWeight: 800, color: "var(--danger-fg)" }}><AlertTriangle size={12} style={{ display: "inline", marginRight: 4 }} /> {((overview.complaint_rate) * 100).toFixed(1)}% Rate</div>
                              </div>
                              <div>
                                <div style={{ color: "var(--fg-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Avg Rating</div>
                                <div style={{ fontWeight: 800, color: "var(--warning-fg)" }}><Smile size={12} style={{ display: "inline", marginRight: 4 }} /> {overview?.average_rating != null ? overview.average_rating.toFixed(1) : "—"}</div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <Link
                          href={`/dashboard?dataset=${datasetId}`}
                          className="btn btn-primary btn-sm"
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", justifyContent: "center" }}
                        >
                          <BarChart3 size={14} /> View Full Dashboard
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: "var(--fg-muted)", fontSize: "0.9rem", textAlign: "center", padding: "1rem" }}>Analysis has not been run.</div>
                )}
              </div>
            </div>
          </FadeIn>

          {/* FAISS Index */}
          <FadeIn delay={0.1}>
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="card-header" style={{ borderBottom: "none", paddingBottom: "0.5rem" }}>
                <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Search size={18} color="var(--chart-teal)" /> Vector Index
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleBuildIndex} disabled={building} style={{ padding: "0.4rem 0.75rem" }}>
                  {building ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><RefreshCw size={14} /> Build Index</>}
                </button>
              </div>
              
              <div style={{ padding: "0 1.5rem 1.5rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                {indexStatus ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <StatusBadge status={indexStatus.status} />
                      <span style={{ color: "var(--fg-2)", fontWeight: 600, fontSize: "0.9rem" }}>{indexStatus.indexed_count.toLocaleString()} vectors</span>
                    </div>
                    <div style={{ color: "var(--fg-muted)", fontSize: "0.8rem", background: "var(--surface-2)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <strong>Model:</strong> {indexStatus.embedding_model.split('/').pop()}<br/>
                      <strong>Type:</strong> {indexStatus.index_type} ({indexStatus.embedding_dimension}d)
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "var(--fg-muted)", fontSize: "0.9rem", textAlign: "center", padding: "1rem" }}>Index not built yet.</div>
                )}
              </div>
            </div>
          </FadeIn>

          {/* Stats Info */}
          <FadeIn delay={0.2}>
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="card-header" style={{ borderBottom: "none", paddingBottom: "0.5rem" }}>
                <div className="card-title">Dataset Details</div>
              </div>
              <div style={{ padding: "0 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1, justifyContent: "center" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: "0.5rem" }}>
                  <span style={{ color: "var(--fg-muted)", fontSize: "0.9rem" }}>Total Rows</span>
                  <span style={{ fontWeight: 700, color: "var(--fg)" }}>{dataset.row_count.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: "0.5rem" }}>
                  <span style={{ color: "var(--fg-muted)", fontSize: "0.9rem" }}>Source</span>
                  <span style={{ fontWeight: 600, color: "var(--fg)" }}>{dataset.source || "Unknown"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--fg-muted)", fontSize: "0.9rem" }}>Last Updated</span>
                  <span style={{ fontWeight: 600, color: "var(--fg)" }}>{new Date(dataset.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </StaggerContainer>

        <FadeIn>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Feedback Records</div>
              <div style={{ fontSize: "0.85rem", color: "var(--fg-muted)", fontWeight: 500 }}>Showing up to 100 recent rows</div>
            </div>
            
            {feedback.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                <Database size={40} color="var(--fg-subtle)" style={{ margin: "0 auto 1rem" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--fg)" }}>No feedback found</h3>
                <p style={{ color: "var(--fg-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>This dataset is completely empty.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--border)" }}>
                      <th style={{ padding: "1rem", fontWeight: 600, color: "var(--fg-2)" }}>Text Content</th>
                      <th style={{ padding: "1rem", fontWeight: 600, color: "var(--fg-2)" }}>Language</th>
                      <th style={{ padding: "1rem", fontWeight: 600, color: "var(--fg-2)" }}>Sentiment</th>
                      <th style={{ padding: "1rem", fontWeight: 600, color: "var(--fg-2)" }}>Rating</th>
                      <th style={{ padding: "1rem", fontWeight: 600, color: "var(--fg-2)" }}>Status</th>
                      <th style={{ padding: "1rem", fontWeight: 600, color: "var(--fg-2)", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map((fb) => (
                      <tr key={fb.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "var(--surface-hover)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: "450px", lineHeight: 1.5, color: "var(--fg)" }}>
                            {fb.original_text}
                          </div>
                        </td>
                        <td style={{ padding: "1rem", color: "var(--fg-2)" }}>
                          {fb.language ? (
                            <span style={{ padding: "0.25rem 0.5rem", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: 600 }}>
                              {fb.language.toUpperCase()}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <SentimentBadge sentiment={fb.processing_status === "completed" ? "positive" : fb.processing_status === "failed" ? "negative" : "neutral"} />
                        </td>
                        <td style={{ padding: "1rem", color: "var(--fg-2)", fontWeight: 600 }}>{fb.rating != null ? `${fb.rating} ⭐` : "—"}</td>
                        <td style={{ padding: "1rem" }}>
                          <StatusBadge status={fb.processing_status} />
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          <Link href={`/feedback/${fb.id}`} style={{ fontSize: "0.85rem", color: "var(--brand)", fontWeight: 600, textDecoration: "none", padding: "0.4rem 0.75rem", background: "var(--brand-light)", borderRadius: "var(--radius-sm)" }}>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeIn>
      </PageTransition>
    </div>
  );
}

export default function DatasetDetailPage() {
  return (
    <AuthGuard>
      <AppShell>
        <DatasetDetailContent />
      </AppShell>
    </AuthGuard>
  );
}
