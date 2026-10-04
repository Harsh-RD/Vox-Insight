"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  BarChart3,
  FileText,
  AlertTriangle,
  TrendingUp,
  Percent,
  Star,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/motion";
import { StatCard } from "@/components/ui/stat-card";
import { SentimentBadge } from "@/components/ui/sentiment-badge";
import {
  api,
  type ComplaintAnalytics,
  type Dataset,
  type EmotionAnalytics,
  type OverviewAnalytics,
  type SentimentAnalytics,
  type TrendsAnalytics,
  type SourceComparisonAnalytics,
  type AspectAnalytics,
} from "@/lib/api";

/* ── Formatters ──────────────────────────────────────────────────────── */
function fmtPct(v: number | null | undefined, d = 1): string {
  return v == null ? "—" : `${v.toFixed(d)}%`;
}
function fmtNum(v: number | null | undefined, d = 1): string {
  return v == null ? "—" : v.toFixed(d);
}
function fmtCount(v: number | null | undefined): string {
  return v == null ? "—" : v.toLocaleString();
}

/* ── Custom Tooltip ──────────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-recharts-tooltip">
      <div className="recharts-tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="recharts-tooltip-item" style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

/* ── Emotion Colors ──────────────────────────────────────────────────── */
const EMOTION_COLORS: Record<string, string> = {
  joy: "#10B981",
  sadness: "#3B82F6",
  anger: "#EF4444",
  fear: "#F59E0B",
  surprise: "#8B5CF6",
  disgust: "#F97316",
  trust: "#14B8A6",
  anticipation: "#06B6D4",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#10B981",
  neutral: "#3B82F6",
  negative: "#EF4444",
  unknown: "#64748B",
};

/* ── Empty State ─────────────────────────────────────────────────────── */
function EmptyDashboard() {
  return (
    <div className="card" style={{ maxWidth: 800, margin: "2rem auto", overflow: "hidden" }}>
      <div style={{ padding: "3rem 2rem", textAlign: "center", background: "linear-gradient(135deg, var(--surface) 0%, var(--brand-light) 100%)" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", boxShadow: "var(--shadow-glow)" }}>
          <Activity size={40} color="var(--brand)" />
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--fg)", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>Welcome to VoxInsight</h2>
        <p style={{ fontSize: "1.1rem", color: "var(--fg-muted)", maxWidth: 500, margin: "0 auto" }}>
          You're just three steps away from unlocking deep, multilingual analytics on your customer feedback.
        </p>
      </div>
      
      <div style={{ padding: "2rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Step 1 */}
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>1</div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--fg)", marginBottom: "0.25rem" }}>Upload your Dataset</h3>
              <p style={{ color: "var(--fg-muted)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                Head over to the Datasets tab and upload a CSV file containing your customer feedback. We support English, Hindi, and Hinglish out of the box!
              </p>
            </div>
          </div>
          
          <div style={{ width: 2, height: 24, background: "var(--border)", marginLeft: 15 }} />
          
          {/* Step 2 */}
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", opacity: 0.7 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-3)", color: "var(--fg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0, border: "1px solid var(--border)" }}>2</div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--fg)", marginBottom: "0.25rem" }}>Run AI Analysis</h3>
              <p style={{ color: "var(--fg-muted)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                Click the "Run NLP Pipeline" button on your dataset to automatically extract sentiment, emotions, and specific complaints using our custom models.
              </p>
            </div>
          </div>
          
          <div style={{ width: 2, height: 24, background: "var(--border)", marginLeft: 15 }} />
          
          {/* Step 3 */}
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", opacity: 0.7 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-3)", color: "var(--fg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0, border: "1px solid var(--border)" }}>3</div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--fg)", marginBottom: "0.25rem" }}>Explore Insights</h3>
              <p style={{ color: "var(--fg-muted)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                Return to this dashboard to see real-time metrics, interactive trend graphs, and semantic searches over your structured data.
              </p>
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: "3rem", display: "flex", justifyContent: "center" }}>
          <Link href="/datasets" className="btn btn-primary" style={{ padding: "0.75rem 2rem", fontSize: "1.05rem" }}>
            Get Started <ArrowRight size={18} style={{ marginLeft: "0.5rem" }} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard Content ───────────────────────────────────────────────── */
function DashboardContent() {
  const { workspaces } = useAuth();
  const workspace = workspaces.find((w) => w.role === "owner") ?? workspaces[0];

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const searchParams = useSearchParams();
  const initialDataset = searchParams.get("dataset") || undefined;
  const [selectedDataset, setSelectedDataset] = useState<string | undefined>(initialDataset);

  // Update selectedDataset if query param changes
  useEffect(() => {
    const d = searchParams.get("dataset");
    if (d) setSelectedDataset(d);
  }, [searchParams]);

  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [sentiment, setSentiment] = useState<SentimentAnalytics | null>(null);
  const [emotions, setEmotions] = useState<EmotionAnalytics | null>(null);
  const [complaints, setComplaints] = useState<ComplaintAnalytics | null>(null);
  const [trends, setTrends] = useState<TrendsAnalytics | null>(null);
  const [sources, setSources] = useState<SourceComparisonAnalytics | null>(null);
  const [aspects, setAspects] = useState<AspectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState("all");
  const [granularity, setGranularity] = useState("daily");

  useEffect(() => {
    if (!workspace?.id) return;
    api.listDatasets(workspace.id).then(setDatasets).catch(() => undefined);
  }, [workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;

    let startDate: string | undefined;
    if (dateRange === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString();
    } else if (dateRange === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString();
    }

    setLoading(true);
    Promise.all([
      api.getOverviewAnalytics(workspace.id, selectedDataset),
      api.getSentimentAnalytics(workspace.id, selectedDataset, startDate),
      api.getEmotionAnalytics(workspace.id, selectedDataset),
      api.getComplaintAnalytics(workspace.id, selectedDataset),
      api.getTrendsAnalytics(workspace.id, selectedDataset, startDate, undefined, granularity),
      api.getSourceComparison(workspace.id, selectedDataset),
      api.getAspectAnalytics(workspace.id, selectedDataset, 8),
    ])
      .then(([ov, sen, emo, comp, tr, src, asp]) => {
        if (cancelled) return;
        setOverview(ov);
        setSentiment(sen);
        setEmotions(emo);
        setComplaints(comp);
        setTrends(tr);
        setSources(src);
        setAspects(asp);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load analytics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace?.id, selectedDataset, dateRange, granularity]);

  if (!workspace) {
    return (
      <div className="page-content" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="animate-spin"><Activity size={32} color="var(--brand)" /></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-content" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="animate-spin"><Activity size={32} color="var(--brand)" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", padding: "1rem", borderRadius: "var(--radius)" }}>
          {error}
        </div>
      </div>
    );
  }

  if (!overview || overview.total_feedback === 0) {
    return (
      <div className="page-content">
        <EmptyDashboard />
      </div>
    );
  }

  /* ── Chart Data ────────────────────────────────────────────────────── */
  const sentimentData = sentiment
    ? Object.entries(sentiment.sentiment_distribution)
        .filter(([k]) => k !== "unknown")
        .map(([name, value]) => ({ name, value }))
    : [];

  const emotionData = emotions
    ? Object.entries(emotions.emotion_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const trendsData = trends?.trends ?? [];
  const sourceData = sources?.sources ?? [];
  const aspectData = aspects?.top_aspects ?? [];

  /* ── Sparkline mock data ─────────────────────────────────────────── */
  const sparkPositive = [40, 45, 42, 48, 52, 50, 55, overview.positive_count % 100 || 60];
  const sparkNegative = [30, 28, 35, 25, 22, 30, 20, overview.negative_count % 100 || 15];
  const sparkTotal = [60, 70, 65, 75, 80, 78, 85, overview.total_feedback % 100 || 90];
  const sparkRating = [3.8, 4.0, 3.9, 4.1, 4.2, 4.0, 4.3, overview.average_rating ?? 4.0];

  return (
    <div className="page-content">
      <PageTransition>
        {/* ── Header + Filters ──────────────────────────────────────── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Executive Dashboard</h1>
            <p className="page-subtitle">
              Real-time feedback intelligence for{" "}
              <strong style={{ color: "var(--brand)" }}>{workspace.name}</strong>
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <select
              className="input"
              style={{ width: "auto", minWidth: 200, padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              value={selectedDataset ?? ""}
              onChange={(e) => setSelectedDataset(e.target.value || undefined)}
            >
              <option value="">All Datasets</option>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--radius)", padding: "0.25rem", border: "1px solid var(--border)" }}>
              {[
                { value: "all", label: "All Time" },
                { value: "30d", label: "30 Days" },
                { value: "7d", label: "7 Days" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    borderRadius: "var(--radius-sm)",
                    background: dateRange === opt.value ? "var(--surface)" : "transparent",
                    color: dateRange === opt.value ? "var(--fg)" : "var(--fg-muted)",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: dateRange === opt.value ? "var(--shadow-sm)" : "none",
                  }}
                  onClick={() => setDateRange(opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--radius)", padding: "0.25rem", border: "1px solid var(--border)" }}>
              {[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    borderRadius: "var(--radius-sm)",
                    background: granularity === opt.value ? "var(--surface)" : "transparent",
                    color: granularity === opt.value ? "var(--fg)" : "var(--fg-muted)",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: granularity === opt.value ? "var(--shadow-sm)" : "none",
                  }}
                  onClick={() => setGranularity(opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI Cards (Bento) ─────────────────────────────────────── */}
        <StaggerContainer className="bento-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="bento-col-4"><StatCard label="Total Feedback" value={fmtCount(overview.total_feedback)} trendData={sparkTotal} color="var(--brand)" icon={<FileText size={16} />} /></div>
          <div className="bento-col-4"><StatCard label="Analysis Coverage" value={fmtPct(overview.analysis_coverage_percentage)} trendData={[60, 65, 70, 75, 80, overview.analysis_coverage_percentage ?? 0]} color="var(--chart-teal)" icon={<Percent size={16} />} /></div>
          <div className="bento-col-4"><StatCard label="Average Rating" value={overview.average_rating != null ? `${overview.average_rating.toFixed(1)} ★` : "—"} trendData={sparkRating} color="var(--warning-fg)" icon={<Star size={16} />} /></div>
          <div className="bento-col-4"><StatCard label="Positive Sentiment" value={fmtCount(overview.positive_count)} trendData={sparkPositive} color="var(--success-fg)" icon={<TrendingUp size={16} />} /></div>
          <div className="bento-col-4"><StatCard label="Complaint Rate" value={fmtPct(overview.complaint_rate)} trendData={sparkNegative} color="var(--danger-fg)" icon={<AlertTriangle size={16} />} /></div>
          <div className="bento-col-4"><StatCard label="Total Analyzed" value={fmtCount(overview.analyzed_feedback)} trendData={[50, 55, 60, 65, 70, overview.analyzed_feedback % 100 || 80]} color="var(--chart-violet)" icon={<Activity size={16} />} /></div>
        </StaggerContainer>

        {/* ── Charts Row 1: Sentiment Trends + Sentiment Distribution ── */}
        <div className="bento-grid" style={{ marginBottom: "1.5rem" }}>
          <FadeIn className="bento-col-8">
            <div className="card" style={{ height: "100%", minHeight: 380, display: "flex", flexDirection: "column" }}>
              <div className="card-header">
                <div className="card-title">Sentiment Trends</div>
              </div>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradPositive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradNeutral" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradNegative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="positive" name="Positive" stroke="#10B981" fill="url(#gradPositive)" strokeWidth={3} />
                    <Area type="monotone" dataKey="neutral" name="Neutral" stroke="#3B82F6" fill="url(#gradNeutral)" strokeWidth={3} />
                    <Area type="monotone" dataKey="negative" name="Negative" stroke="#EF4444" fill="url(#gradNegative)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeIn>

          <FadeIn className="bento-col-4">
            <div className="card" style={{ height: "100%", minHeight: 380, display: "flex", flexDirection: "column" }}>
              <div className="card-header">
                <div className="card-title">Sentiment Distribution</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={55}
                        paddingAngle={5}
                        strokeWidth={0}
                      >
                        {sentimentData.map((entry) => (
                          <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] ?? "#64748B"} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", marginTop: "1rem" }}>
                  {sentimentData.map((entry) => (
                    <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: SENTIMENT_COLORS[entry.name] ?? "#64748B" }} />
                      <span style={{ fontSize: "0.85rem", color: "var(--fg-2)", textTransform: "capitalize", fontWeight: 600 }}>{entry.name}</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--fg)", marginLeft: "auto" }}>{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* ── Charts Row 2: Emotions + Top Aspects ──────────────────── */}
        <div className="bento-grid" style={{ marginBottom: "1.5rem" }}>
          <FadeIn className="bento-col-6">
            <div className="card" style={{ height: "100%" }}>
              <div className="card-header">
                <div className="card-title">Emotion Distribution</div>
              </div>
              {emotionData.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                  {emotionData
                    .sort((a, b) => b.value - a.value)
                    .map((em) => {
                      const max = Math.max(...emotionData.map((d) => d.value));
                      const pct = max > 0 ? (em.value / max) * 100 : 0;
                      return (
                        <div key={em.name}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                            <span style={{ color: "var(--fg)", textTransform: "capitalize", fontWeight: 600 }}>{em.name}</span>
                            <span style={{ color: "var(--fg-2)", fontWeight: 700 }}>{em.value}</span>
                          </div>
                          <div style={{ height: 8, background: "var(--surface-2)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: EMOTION_COLORS[em.name] ?? "var(--brand)", borderRadius: "var(--radius-full)" }} />
                          </div>
                        </div>
                      );
                    })}
                  {emotions?.emotion_coverage_percentage != null && (
                    <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", marginTop: "0.5rem", fontWeight: 500, textAlign: "right" }}>
                      Coverage: {emotions.emotion_coverage_percentage.toFixed(1)}%
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">No emotion data available</div>
              )}
            </div>
          </FadeIn>

          <FadeIn className="bento-col-6">
            <div className="card" style={{ height: "100%" }}>
              <div className="card-header">
                <div className="card-title">Top Aspects Mentions</div>
              </div>
              {aspectData.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                  {aspectData.slice(0, 8).map((asp) => {
                    const max = Math.max(...aspectData.map((a) => a.mentions));
                    const pct = max > 0 ? (asp.mentions / max) * 100 : 0;
                    return (
                      <div key={asp.aspect_term}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                          <span style={{ color: "var(--fg)", fontWeight: 600 }}>{asp.aspect_term}</span>
                          <span style={{ color: "var(--fg-2)", fontWeight: 700 }}>{asp.mentions} mentions</span>
                        </div>
                        <div style={{ height: 8, background: "var(--surface-2)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "var(--chart-violet)", borderRadius: "var(--radius-full)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">No aspect data available</div>
              )}
            </div>
          </FadeIn>
        </div>

        {/* ── Charts Row 3: Source Analytics + Complaint Breakdown ───── */}
        <div className="bento-grid">
          <FadeIn className="bento-col-6">
            <div className="card" style={{ height: 350, display: "flex", flexDirection: "column" }}>
              <div className="card-header">
                <div className="card-title">Source Analytics</div>
              </div>
              {sourceData.length > 0 ? (
                <div style={{ flex: 1, marginTop: "1rem" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceData.map((s) => ({ name: s.source || "Unknown", count: s.feedback_count }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Feedback" fill="var(--brand)" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-state">No source data available</div>
              )}
            </div>
          </FadeIn>

          <FadeIn className="bento-col-6">
            <div className="card" style={{ height: 350, display: "flex", flexDirection: "column" }}>
              <div className="card-header">
                <div className="card-title">Complaint Analysis</div>
              </div>
              {complaints ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", textAlign: "center" }}>
                    <div style={{ padding: "1.5rem 1rem", background: "var(--danger-bg)", borderRadius: "var(--radius-lg)" }}>
                      <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--danger-fg)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{complaints.complaint_true}</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--danger-fg)", marginTop: "0.5rem" }}>Complaints</div>
                    </div>
                    <div style={{ padding: "1.5rem 1rem", background: "var(--success-bg)", borderRadius: "var(--radius-lg)" }}>
                      <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--success-fg)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{complaints.complaint_false}</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--success-fg)", marginTop: "0.5rem" }}>Non-Complaints</div>
                    </div>
                    <div style={{ padding: "1.5rem 1rem", background: "var(--surface-2)", borderRadius: "var(--radius-lg)" }}>
                      <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--fg-muted)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{complaints.complaint_unknown}</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--fg-muted)", marginTop: "0.5rem" }}>Unknown</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", padding: "1rem", borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Overall Complaint Rate</div>
                    <div style={{ fontSize: "3rem", fontWeight: 800, color: "var(--brand)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{fmtPct(complaints.complaint_rate)}</div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">No complaint data</div>
              )}
            </div>
          </FadeIn>
        </div>
      </PageTransition>
    </div>
  );
}

/* ── Export ───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <AuthGuard>
      <AppShell>
        <Suspense fallback={<div className="page-content" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><div className="animate-spin"><Activity size={32} color="var(--brand)" /></div></div>}>
          <DashboardContent />
        </Suspense>
      </AppShell>
    </AuthGuard>
  );
}
