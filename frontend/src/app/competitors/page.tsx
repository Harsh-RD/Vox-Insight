"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useCallback } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import {
  api,
  ApiError,
  type Competitor,
  type CompetitorAnalysisResult,
  type Dataset,
  type DatasetCompetitorAnalysisSummary,
} from "@/lib/api";

function CompetitorsContent() {
  const { workspaces, logout } = useAuth();
  const router = useRouter();
  const selectedWorkspace = workspaces[0];

  const [workspaceId, setWorkspaceId] = useState("");
  const activeWorkspaceId = workspaceId || selectedWorkspace?.id || "";

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [analytics, setAnalytics] = useState<CompetitorAnalysisResult[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for creating new competitor
  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAliases, setEditAliases] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const refreshData = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const [comps, analysisResults, dsList] = await Promise.all([
        api.listCompetitors(activeWorkspaceId),
        api.getCompetitorAnalysis(activeWorkspaceId, selectedDatasetId || undefined),
        api.listDatasets(activeWorkspaceId),
      ]);
      setCompetitors(comps);
      setAnalytics(analysisResults);
      setDatasets(dsList);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to load competitor data.");
    }
  }, [activeWorkspaceId, selectedDatasetId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    let active = true;
    Promise.all([
      api.listCompetitors(activeWorkspaceId),
      api.getCompetitorAnalysis(activeWorkspaceId, selectedDatasetId || undefined),
      api.listDatasets(activeWorkspaceId),
    ])
      .then(([comps, analysisResults, dsList]) => {
        if (!active) return;
        setCompetitors(comps);
        setAnalytics(analysisResults);
        setDatasets(dsList);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof ApiError ? caught.message : "Failed to load competitor data.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeWorkspaceId, selectedDatasetId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!activeWorkspaceId || !name.trim()) return;
    setError(null);
    setSuccessMessage(null);
    try {
      const aliasList = aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      await api.createCompetitor({
        workspace_id: activeWorkspaceId,
        name: name.trim(),
        aliases: aliasList,
        description: description.trim() || undefined,
        active,
      });
      setName("");
      setAliases("");
      setDescription("");
      setActive(true);
      setSuccessMessage("Competitor added successfully.");
      await refreshData();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to create competitor.");
    }
  }

  function startEdit(comp: Competitor) {
    setEditingId(comp.id);
    setEditName(comp.name);
    setEditAliases(comp.aliases.join(", "));
    setEditDesc(comp.description || "");
    setEditActive(comp.active);
  }

  async function saveEdit(comp: Competitor) {
    setError(null);
    try {
      const aliasList = editAliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      await api.updateCompetitor(comp.id, {
        name: editName.trim(),
        aliases: aliasList,
        description: editDesc.trim() || undefined,
        active: editActive,
      });
      setEditingId(null);
      setSuccessMessage("Competitor updated.");
      await refreshData();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to update competitor.");
    }
  }

  async function handleDelete(comp: Competitor) {
    if (!confirm(`Are you sure you want to delete "${comp.name}"?`)) return;
    setError(null);
    try {
      await api.deleteCompetitor(comp.id);
      setSuccessMessage(`Competitor "${comp.name}" deleted.`);
      await refreshData();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to delete competitor.");
    }
  }

  async function runDatasetAnalysis() {
    if (!selectedDatasetId) {
      setError("Please select a dataset to analyze.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const summary: DatasetCompetitorAnalysisSummary =
        await api.analyzeDatasetCompetitors(selectedDatasetId);
      setSuccessMessage(
        `Analysis complete: scanned ${summary.scanned_feedback_count} feedbacks, identified ${summary.mentions_found} mentions across ${summary.competitors_detected} competitors.`
      );
      await refreshData();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to analyze dataset.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">VoxInsight Intelligence</p>
          <h1>Competitor Analysis</h1>
        </div>
        <div className="header-actions">
          <Link className="secondary-link" href="/dashboard">Dashboard</Link>
          <Link className="secondary-link" href="/datasets">Datasets</Link>
          <Link className="secondary-link" href="/search">Semantic Search</Link>
          <Link className="secondary-link" href="/alerts">Alerts</Link>
          <Link className="secondary-link" href="/chat">Assistant</Link>
          <button className="secondary-button" type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* Workspace and Dataset Selectors */}
      <section className="filters-section">
        <div className="filter-group">
          <label htmlFor="comp-workspace">Workspace:</label>
          <select
            id="comp-workspace"
            value={activeWorkspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="filter-select"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="comp-dataset">Dataset Filter:</label>
          <select
            id="comp-dataset"
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="filter-select"
          >
            <option value="">All Datasets</option>
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>

        {selectedDatasetId && (
          <button
            type="button"
            onClick={runDatasetAnalysis}
            disabled={isAnalyzing}
            style={{ marginLeft: "auto" }}
          >
            {isAnalyzing ? "Scanning Feedbacks…" : "Run Competitor Analysis"}
          </button>
        )}
      </section>

      {error && <div className="error-banner">{error}</div>}
      {successMessage && <div className="upload-summary">{successMessage}</div>}

      {/* Add Competitor Section */}
      <section className="workspace-section">
        <h2>Add Competitor</h2>
        <p className="muted">
          Configure competitors and known aliases for deterministic mention extraction.
        </p>
        <form onSubmit={handleCreate} className="auth-form" style={{ maxWidth: "48rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label>
              Competitor Name:
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Competitor X"
                required
              />
            </label>
            <label>
              Aliases (comma separated):
              <input
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                placeholder="e.g. comp x, competitorx, cx"
              />
            </label>
          </div>
          <label>
            Description (optional):
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief context or product line"
            />
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              id="active-checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              style={{ width: "1.2rem", height: "1.2rem" }}
            />
            <label htmlFor="active-checkbox" style={{ margin: 0, fontWeight: "normal" }}>
              Active (scanned during dataset feedback analysis)
            </label>
          </div>
          <button type="submit" style={{ maxWidth: "12rem" }}>Add Competitor</button>
        </form>
      </section>

      {/* Competitor Analytics Comparison */}
      <section className="chart-section" style={{ marginTop: "2rem" }}>
        <h2>Competitor Benchmarking & Sentiment</h2>
        {isLoading ? (
          <div className="loading-spinner">Loading analytics…</div>
        ) : analytics.length === 0 ? (
          <p className="muted">No competitor mentions detected yet. Add competitors and run analysis.</p>
        ) : (
          <div className="feedback-table">
            <table>
              <thead>
                <tr>
                  <th>Competitor</th>
                  <th>Mentions</th>
                  <th>Unique Feedbacks</th>
                  <th>Sentiment Coverage</th>
                  <th>Positive %</th>
                  <th>Neutral %</th>
                  <th>Negative %</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((item) => (
                  <tr key={item.competitor_id}>
                    <td>
                      <strong>{item.competitor_name}</strong>
                    </td>
                    <td>{item.total_mentions}</td>
                    <td>{item.unique_feedback_count}</td>
                    <td>
                      {item.sentiment_coverage !== null ? `${item.sentiment_coverage}%` : "—"}
                    </td>
                    <td>
                      <span className="sentiment-badge positive">
                        {item.positive_percentage !== null ? `${item.positive_percentage}%` : "—"}
                      </span>
                    </td>
                    <td>
                      <span className="sentiment-badge neutral">
                        {item.neutral_percentage !== null ? `${item.neutral_percentage}%` : "—"}
                      </span>
                    </td>
                    <td>
                      <span className="sentiment-badge negative">
                        {item.negative_percentage !== null ? `${item.negative_percentage}%` : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Configured Competitors List */}
      <section className="workspace-section">
        <h2>Configured Competitors ({competitors.length})</h2>
        {isLoading ? (
          <p className="muted">Loading competitors…</p>
        ) : competitors.length === 0 ? (
          <p className="muted">No competitors configured for this workspace.</p>
        ) : (
          <ul className="workspace-list">
            {competitors.map((comp) => (
              <li key={comp.id} style={{ alignItems: "flex-start", gap: "1rem" }}>
                {editingId === comp.id ? (
                  <div style={{ flex: 1, display: "grid", gap: "0.5rem" }}>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Competitor Name"
                    />
                    <input
                      value={editAliases}
                      onChange={(e) => setEditAliases(e.target.value)}
                      placeholder="Aliases (comma-separated)"
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Description"
                    />
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                        id={`edit-active-${comp.id}`}
                      />
                      <label htmlFor={`edit-active-${comp.id}`}>Active</label>
                      <button type="button" onClick={() => saveEdit(comp)} style={{ minHeight: "2rem", padding: "0.3rem 0.8rem" }}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setEditingId(null)}
                        style={{ minHeight: "2rem", padding: "0.3rem 0.8rem" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <strong>{comp.name}</strong>
                      <span style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
                        {comp.aliases.length > 0 ? (
                          comp.aliases.map((alias) => (
                            <span
                              key={alias}
                              style={{
                                background: "#f0f2f7",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                              }}
                            >
                              {alias}
                            </span>
                          ))
                        ) : (
                          <span className="muted" style={{ fontSize: "0.8rem" }}>No aliases</span>
                        )}
                      </span>
                      {comp.description && (
                        <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
                          {comp.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="role-badge" style={{ background: comp.active ? "#d1fae5" : "#fee2e2" }}>
                        {comp.active ? "Active" : "Inactive"}
                      </span>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => startEdit(comp)}
                        style={{ minHeight: "2rem", padding: "0.25rem 0.6rem" }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleDelete(comp)}
                        style={{ minHeight: "2rem", padding: "0.25rem 0.6rem", color: "var(--danger)" }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function CompetitorsPage() {
  return (
    <AuthGuard>
      <CompetitorsContent />
    </AuthGuard>
  );
}
