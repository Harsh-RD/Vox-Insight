"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Users, Search, Plus, Activity, Edit2, Trash2, ShieldAlert, Check } from "lucide-react";
import { motion } from "framer-motion";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/motion";
import {
  api,
  ApiError,
  type Competitor,
  type CompetitorAnalysisResult,
  type Dataset,
  type DatasetCompetitorAnalysisSummary,
} from "@/lib/api";

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

function CompetitorsContent() {
  const { workspaces } = useAuth();
  const workspace = workspaces.find((w) => w.role === "owner") ?? workspaces[0];
  const activeWorkspaceId = workspace?.id ?? "";

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [analytics, setAnalytics] = useState<CompetitorAnalysisResult[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");
  const [description, setDescription] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAliases, setEditAliases] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editActive, setEditActive] = useState(true);

  const loadData = useCallback(async () => {
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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load competitor data.");
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
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof ApiError ? e.message : "Failed to load competitor data.");
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
      const aliasList = aliases.split(",").map((a) => a.trim()).filter(Boolean);
      await api.createCompetitor({
        workspace_id: activeWorkspaceId,
        name: name.trim(),
        aliases: aliasList,
        description: description.trim() || undefined,
        active: true,
      });
      setName("");
      setAliases("");
      setDescription("");
      setShowAddForm(false);
      setSuccessMessage("Competitor added successfully.");
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create competitor.");
    }
  }

  async function saveEdit(comp: Competitor) {
    setError(null);
    try {
      const aliasList = editAliases.split(",").map((a) => a.trim()).filter(Boolean);
      await api.updateCompetitor(comp.id, {
        name: editName.trim(),
        aliases: aliasList,
        description: editDesc.trim() || undefined,
        active: editActive,
      });
      setEditingId(null);
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update competitor.");
    }
  }

  async function handleDelete(comp: Competitor) {
    if (!confirm(`Delete "${comp.name}"?`)) return;
    setError(null);
    try {
      await api.deleteCompetitor(comp.id);
      setSuccessMessage(`"${comp.name}" deleted.`);
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete competitor.");
    }
  }

  async function runAnalysis() {
    if (!selectedDatasetId) { setError("Select a dataset to analyze."); return; }
    setIsAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const summary: DatasetCompetitorAnalysisSummary = await api.analyzeDatasetCompetitors(selectedDatasetId);
      setSuccessMessage(
        `Analysis complete: ${summary.scanned_feedback_count.toLocaleString()} feedbacks scanned, ` +
        `${summary.mentions_found.toLocaleString()} mentions found across ${summary.competitors_detected} competitors.`
      );
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to analyze dataset.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (isLoading) {
    return <div className="page-content" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><div className="animate-spin"><Activity size={32} color="var(--brand)" /></div></div>;
  }

  return (
    <div className="page-content">
      <PageTransition>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: "2rem" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={24} color="var(--brand)" /> Competitor Intelligence
            </h1>
            <p className="page-subtitle">Track and benchmark competitor mentions in your customer feedback.</p>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <select
              className="input"
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              style={{ width: 250, padding: "0.5rem 1rem" }}
            >
              <option value="">Select dataset to analyze</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {selectedDatasetId && competitors.length > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={runAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Activity size={16} /></motion.div> Scanning...</> : <><Search size={16} /> Scan Dataset</>}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} /> Add Competitor
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", padding: "1rem", borderRadius: "var(--radius)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <ShieldAlert size={20} /> {error}
          </div>
        )}
        {successMessage && (
          <div style={{ background: "var(--success-bg)", color: "var(--success-fg)", padding: "1rem", borderRadius: "var(--radius)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Check size={20} /> {successMessage}
          </div>
        )}

        {/* Add competitor form */}
        {showAddForm && (
          <FadeIn>
            <div className="card" style={{ marginBottom: "2rem" }}>
              <div className="card-header">
                <div className="card-title">Add New Competitor</div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div>
                    <label className="input-label" htmlFor="comp-name">Competitor Name *</label>
                    <input className="input" id="comp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corp" required />
                  </div>
                  <div>
                    <label className="input-label" htmlFor="comp-aliases">Aliases (comma-separated)</label>
                    <input className="input" id="comp-aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="e.g. acme, acme corp, acmecorp" />
                  </div>
                </div>
                <div>
                  <label className="input-label" htmlFor="comp-desc">Description (optional)</label>
                  <input className="input" id="comp-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief context about this competitor" />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary"><Plus size={16} /> Create Competitor</button>
                </div>
              </form>
            </div>
          </FadeIn>
        )}

        {/* Analytics table */}
        {analytics.length > 0 && (
          <FadeIn>
            <div className="card" style={{ marginBottom: "2rem" }}>
              <div className="card-header">
                <div className="card-title">Competitor Benchmarking</div>
              </div>
              <div style={{ overflowX: "auto", marginTop: "1rem" }}>
                <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-strong)", color: "var(--fg-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <th style={{ padding: "1rem 0" }}>Competitor</th>
                      <th style={{ padding: "1rem 0" }}>Total Mentions</th>
                      <th style={{ padding: "1rem 0" }}>Unique Feedbacks</th>
                      <th style={{ padding: "1rem 0" }}>Coverage</th>
                      <th style={{ padding: "1rem 0" }}>Positive</th>
                      <th style={{ padding: "1rem 0" }}>Neutral</th>
                      <th style={{ padding: "1rem 0" }}>Negative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((item) => (
                      <tr key={item.competitor_id} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.95rem" }}>
                        <td style={{ padding: "1rem 0", fontWeight: 700, color: "var(--fg)" }}>{item.competitor_name}</td>
                        <td style={{ padding: "1rem 0", color: "var(--fg-2)" }}>{item.total_mentions.toLocaleString()}</td>
                        <td style={{ padding: "1rem 0", color: "var(--fg-2)" }}>{item.unique_feedback_count.toLocaleString()}</td>
                        <td style={{ padding: "1rem 0", color: "var(--fg-2)" }}>{fmtPct(item.sentiment_coverage)}</td>
                        <td style={{ padding: "1rem 0" }}><span style={{ color: "var(--success-fg)", fontWeight: 700 }}>{fmtPct(item.positive_percentage)}</span></td>
                        <td style={{ padding: "1rem 0" }}><span style={{ color: "var(--info-fg)", fontWeight: 700 }}>{fmtPct(item.neutral_percentage)}</span></td>
                        <td style={{ padding: "1rem 0" }}><span style={{ color: "var(--danger-fg)", fontWeight: 700 }}>{fmtPct(item.negative_percentage)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        )}

        {/* Configured competitors */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tracked Competitors ({competitors.length})</div>
            {!showAddForm && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(true)}>+ Add</button>
            )}
          </div>

          {competitors.length === 0 ? (
            <div className="empty-state" style={{ marginTop: "2rem" }}>
              <div className="empty-icon"><Users size={32} /></div>
              <div className="empty-title">No competitors yet</div>
              <div className="empty-description">
                Add competitors and their aliases, then scan a feedback dataset to detect mentions.
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: "1rem" }}
                onClick={() => setShowAddForm(true)}
              >
                Add First Competitor
              </button>
            </div>
          ) : (
            <StaggerContainer className="bento-grid" style={{ marginTop: "1.5rem" }}>
              {competitors.map((comp) => (
                <FadeIn key={comp.id} className="bento-col-4">
                  <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", height: "100%", display: "flex", flexDirection: "column" }}>
                    {editingId === comp.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                        <input className="input" value={editAliases} onChange={(e) => setEditAliases(e.target.value)} placeholder="Aliases (comma-sep)" />
                        <input className="input" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                            <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                            Active Tracking
                          </label>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEdit(comp)}>Save</button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--fg)", fontFamily: "var(--font-display)" }}>
                            {comp.name}
                          </div>
                          <span style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontWeight: 700, borderRadius: "var(--radius-sm)", background: comp.active ? "var(--success-bg)" : "var(--border)", color: comp.active ? "var(--success-fg)" : "var(--fg-muted)" }}>
                            {comp.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {comp.description && (
                          <div style={{ fontSize: "0.9rem", color: "var(--fg-muted)", marginBottom: "1rem", lineHeight: 1.5 }}>{comp.description}</div>
                        )}
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem", flex: 1, alignContent: "flex-start" }}>
                          {comp.aliases.map((alias) => (
                            <span key={alias} style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", color: "var(--fg-2)", fontWeight: 500 }}>{alias}</span>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => {
                              setEditingId(comp.id);
                              setEditName(comp.name);
                              setEditAliases(comp.aliases.join(", "));
                              setEditDesc(comp.description ?? "");
                              setEditActive(comp.active);
                            }}
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDelete(comp)}
                            style={{ color: "var(--danger-fg)", borderColor: "var(--danger-bg)", background: "var(--danger-bg)" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </FadeIn>
              ))}
            </StaggerContainer>
          )}
        </div>

        {/* Missing data hints */}
        {!isLoading && competitors.length > 0 && analytics.length === 0 && (
          <div style={{ background: "var(--brand-light)", color: "var(--brand)", padding: "1.5rem", borderRadius: "var(--radius-lg)", marginTop: "2rem", textAlign: "center", border: "1px dashed var(--brand)" }}>
            <strong>Next step:</strong> Select a dataset from the top dropdown and click &ldquo;Scan Dataset&rdquo; to detect competitor mentions in your feedback.
          </div>
        )}
      </PageTransition>
    </div>
  );
}

export default function CompetitorsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <CompetitorsContent />
      </AppShell>
    </AuthGuard>
  );
}
