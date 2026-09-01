"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { api, Dataset, OverviewAnalytics, SentimentAnalytics, AspectAnalytics, EmotionAnalytics, ComplaintAnalytics, TrendsAnalytics } from "@/lib/api";

function DashboardContent() {
  const { workspaces, logout } = useAuth();
  const router = useRouter();
  const personalWorkspace = workspaces.find((workspace) => workspace.role === "owner") ?? workspaces[0];
  
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | undefined>();
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [sentiment, setSentiment] = useState<SentimentAnalytics | null>(null);
  const [aspects, setAspects] = useState<AspectAnalytics | null>(null);
  const [emotions, setEmotions] = useState<EmotionAnalytics | null>(null);
  const [complaints, setComplaints] = useState<ComplaintAnalytics | null>(null);
  const [trends, setTrends] = useState<TrendsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  // Load datasets for the workspace
  useEffect(() => {
    if (!personalWorkspace?.id) return;
    
    const loadDatasets = async () => {
      try {
        const ds = await api.listDatasets(personalWorkspace.id);
        setDatasets(ds);
      } catch (err) {
        console.error("Failed to load datasets:", err);
      }
    };
    
    loadDatasets();
  }, [personalWorkspace?.id]);

  // Load analytics data
  useEffect(() => {
    if (!personalWorkspace?.id) return;
    
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [overviewData, sentimentData, aspectsData, emotionsData, complaintsData, trendsData] = await Promise.all([
          api.getOverviewAnalytics(personalWorkspace.id, selectedDataset),
          api.getSentimentAnalytics(personalWorkspace.id, selectedDataset),
          api.getAspectAnalytics(personalWorkspace.id, selectedDataset),
          api.getEmotionAnalytics(personalWorkspace.id, selectedDataset),
          api.getComplaintAnalytics(personalWorkspace.id, selectedDataset),
          api.getTrendsAnalytics(personalWorkspace.id, selectedDataset),
        ]);
        
        setOverview(overviewData);
        setSentiment(sentimentData);
        setAspects(aspectsData);
        setEmotions(emotionsData);
        setComplaints(complaintsData);
        setTrends(trendsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    
    loadAnalytics();
  }, [personalWorkspace?.id, selectedDataset]);

  if (!personalWorkspace) return <div>No workspace found</div>;

  return (
    <main className="analytics-dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">VoxInsight</p>
          <h1>Analytics & Insights</h1>
        </div>
        <div className="header-actions">
          <Link className="secondary-link" href="/datasets">Datasets</Link>
          <Link className="secondary-link" href="/search">Semantic search</Link>
          <Link className="secondary-link" href="/chat">Assistant</Link>
          <button className="secondary-button" type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* Workspace and Dataset Selection */}
      <section className="filters-section">
        <div className="filter-group">
          <label htmlFor="workspace">Workspace:</label>
          <span className="workspace-name">{personalWorkspace.name}</span>
        </div>
        
        <div className="filter-group">
          <label htmlFor="dataset">Dataset:</label>
          <select 
            id="dataset"
            value={selectedDataset || ""}
            onChange={(e) => setSelectedDataset(e.target.value || undefined)}
            className="filter-select"
          >
            <option value="">All Datasets</option>
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-spinner">Loading analytics...</div>
      ) : (
        <>
          {/* Overview KPI Cards */}
          <section className="kpi-section">
            <h2>Overview</h2>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Total Feedback</div>
                <div className="kpi-value">{overview?.total_feedback ?? 0}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Analyzed</div>
                <div className="kpi-value">{overview?.analyzed_feedback ?? 0}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Coverage</div>
                <div className="kpi-value">{overview?.analysis_coverage_percentage !== null ? `${overview?.analysis_coverage_percentage.toFixed(1)}%` : "N/A"}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Avg Rating</div>
                <div className="kpi-value">{overview?.average_rating !== null ? overview?.average_rating.toFixed(2) : "N/A"}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Complaint Rate</div>
                <div className="kpi-value">{complaints?.complaint_rate !== null ? `${complaints?.complaint_rate.toFixed(1)}%` : "N/A"}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Emotion Coverage</div>
                <div className="kpi-value">{emotions?.emotion_coverage_percentage !== null ? `${emotions?.emotion_coverage_percentage.toFixed(1)}%` : "N/A"}</div>
              </div>
            </div>
          </section>

          {/* Sentiment Distribution */}
          <section className="chart-section">
            <h2>Sentiment Distribution</h2>
            <div className="chart-container">
              <div className="sentiment-chart">
                {sentiment && (
                  <div className="sentiment-bars">
                    <div className="bar-item">
                      <div className="bar-label">Positive</div>
                      <div className="bar-container">
                        <div className="bar positive" style={{width: `${sentiment.sentiment_percentages.positive ?? 0}%`}}></div>
                      </div>
                      <div className="bar-value">{sentiment.sentiment_distribution.positive ?? 0} ({sentiment.sentiment_percentages.positive?.toFixed(1) ?? 0}%)</div>
                    </div>
                    <div className="bar-item">
                      <div className="bar-label">Neutral</div>
                      <div className="bar-container">
                        <div className="bar neutral" style={{width: `${sentiment.sentiment_percentages.neutral ?? 0}%`}}></div>
                      </div>
                      <div className="bar-value">{sentiment.sentiment_distribution.neutral ?? 0} ({sentiment.sentiment_percentages.neutral?.toFixed(1) ?? 0}%)</div>
                    </div>
                    <div className="bar-item">
                      <div className="bar-label">Negative</div>
                      <div className="bar-container">
                        <div className="bar negative" style={{width: `${sentiment.sentiment_percentages.negative ?? 0}%`}}></div>
                      </div>
                      <div className="bar-value">{sentiment.sentiment_distribution.negative ?? 0} ({sentiment.sentiment_percentages.negative?.toFixed(1) ?? 0}%)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Top Aspects */}
          {aspects && aspects.top_aspects.length > 0 && (
            <section className="chart-section">
              <h2>Top Aspects</h2>
              <div className="aspects-container">
                {aspects.top_aspects.slice(0, 10).map((aspect) => (
                  <div key={aspect.aspect_term} className="aspect-card">
                    <div className="aspect-name">{aspect.aspect_term}</div>
                    <div className="aspect-mentions">{aspect.mentions} mentions</div>
                    <div className="aspect-sentiment">
                      <div className="sentiment-badge positive">{aspect.sentiment_distribution.positive}</div>
                      <div className="sentiment-badge neutral">{aspect.sentiment_distribution.neutral}</div>
                      <div className="sentiment-badge negative">{aspect.sentiment_distribution.negative}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Emotion Distribution */}
          {emotions && (
            <section className="chart-section">
              <h2>Emotion Distribution</h2>
              <div className="emotion-stats">
                <div className="emotion-coverage">
                  Coverage: {emotions.emotion_coverage_percentage !== null ? `${emotions.emotion_coverage_percentage.toFixed(1)}%` : "N/A"} ({emotions.total_with_emotion} / {emotions.total_analyses})
                </div>
                <div className="emotion-list">
                  {Object.entries(emotions.emotion_distribution).map(([emotion, count]) => (
                    <div key={emotion} className="emotion-item">
                      <div className="emotion-name">{emotion}</div>
                      <div className="emotion-count">{count}</div>
                      <div className="emotion-percentage">
                        {emotions.total_with_emotion > 0 ? `${((count / emotions.total_with_emotion) * 100).toFixed(1)}%` : "0%"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Complaint Analytics */}
          {complaints && (
            <section className="chart-section">
              <h2>Complaint Analysis</h2>
              <div className="complaint-stats">
                <div className="complaint-item">
                  <div className="complaint-label">Complaints (Known)</div>
                  <div className="complaint-value">{complaints.complaint_true}</div>
                </div>
                <div className="complaint-item">
                  <div className="complaint-label">Non-Complaints</div>
                  <div className="complaint-value">{complaints.complaint_false}</div>
                </div>
                <div className="complaint-item">
                  <div className="complaint-label">Unknown</div>
                  <div className="complaint-value">{complaints.complaint_unknown}</div>
                </div>
                <div className="complaint-rate">
                  <div className="complaint-label">Complaint Rate</div>
                  <div className="complaint-value">{complaints.complaint_rate !== null ? `${complaints.complaint_rate.toFixed(1)}%` : "N/A"}</div>
                </div>
              </div>
            </section>
          )}

          {/* Trends */}
          {trends && trends.trends.length > 0 && (
            <section className="chart-section">
              <h2>Sentiment Trends</h2>
              <div className="trends-container">
                <div className="trends-table">
                  <div className="trends-header">
                    <div className="trends-col">Date</div>
                    <div className="trends-col">Positive</div>
                    <div className="trends-col">Neutral</div>
                    <div className="trends-col">Negative</div>
                    <div className="trends-col">Total</div>
                  </div>
                  {trends.trends.map((point) => (
                    <div key={point.date} className="trends-row">
                      <div className="trends-col">{point.date}</div>
                      <div className="trends-col positive">{point.positive}</div>
                      <div className="trends-col neutral">{point.neutral}</div>
                      <div className="trends-col negative">{point.negative}</div>
                      <div className="trends-col">{point.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default function AnalyticsDashboard() {
  return <AuthGuard><DashboardContent /></AuthGuard>;
}
