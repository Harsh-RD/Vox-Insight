"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Bell, Activity, Plus, Search, ShieldAlert, Check, Play, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/motion";
import {
  api,
  ApiError,
  type Alert,
  type AlertEvaluationItem,
  type Competitor,
  type Dataset,
} from "@/lib/api";

const METRIC_LABELS: Record<string, string> = {
  negative_sentiment_percentage: "Negative Sentiment %",
  complaint_rate: "Complaint Rate %",
  analysis_coverage_percentage: "Analysis Coverage %",
  competitor_negative_percentage: "Competitor Negative %",
  competitor_mentions: "Competitor Mentions",
};

const OPERATOR_SYMBOLS: Record<string, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
};

function AlertsContent() {
  const { workspaces } = useAuth();
  const workspace = workspaces.find((w) => w.role === "owner") ?? workspaces[0];
  const activeWorkspaceId = workspace?.id ?? "";

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, AlertEvaluationItem>>({});
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newMetric, setNewMetric] = useState("negative_sentiment_percentage");
  const [newOperator, setNewOperator] = useState("gte");
  const [newThreshold, setNewThreshold] = useState<number>(50);
  const [newDatasetId, setNewDatasetId] = useState("");
  const [newCompetitorId, setNewCompetitorId] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editOperator, setEditOperator] = useState("");
  const [editThreshold, setEditThreshold] = useState<number>(0);
  const [editEnabled, setEditEnabled] = useState(true);

  const loadData = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const [alertsList, dsList, compsList] = await Promise.all([
        api.listAlerts(activeWorkspaceId),
        api.listDatasets(activeWorkspaceId),
        api.listCompetitors(activeWorkspaceId),
      ]);
      setAlerts(alertsList);
      setDatasets(dsList);
      setCompetitors(compsList);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load alerts data.");
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    let active = true;
    Promise.all([
      api.listAlerts(activeWorkspaceId),
      api.listDatasets(activeWorkspaceId),
      api.listCompetitors(activeWorkspaceId),
    ])
      .then(([alertsList, dsList, compsList]) => {
        if (!active) return;
        setAlerts(alertsList);
        setDatasets(dsList);
        setCompetitors(compsList);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof ApiError ? e.message : "Failed to load alerts data.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeWorkspaceId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!activeWorkspaceId || !newName.trim()) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await api.createAlert({
        workspace_id: activeWorkspaceId,
        name: newName.trim(),
        metric: newMetric,
        operator: newOperator,
        threshold: Number(newThreshold),
        dataset_id: newDatasetId || undefined,
        competitor_id: newCompetitorId || undefined,
        enabled: true,
      });
      setNewName("");
      setNewThreshold(50);
      setNewDatasetId("");
      setNewCompetitorId("");
      setShowCreateForm(false);
      setSuccessMessage("Alert created.");
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create alert.");
    }
  }

  async function toggleEnabled(alert: Alert) {
    setError(null);
    try {
      await api.updateAlert(alert.id, { enabled: !alert.enabled });
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to toggle alert.");
    }
  }

  async function saveEdit(alert: Alert) {
    setError(null);
    try {
      await api.updateAlert(alert.id, {
        name: editName.trim(),
        operator: editOperator,
        threshold: Number(editThreshold),
        enabled: editEnabled,
      });
      setEditingId(null);
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update alert.");
    }
  }

  async function handleDelete(alert: Alert) {
    if (!confirm(`Delete alert "${alert.name}"?`)) return;
    setError(null);
    try {
      await api.deleteAlert(alert.id);
      setSuccessMessage(`Alert "${alert.name}" deleted.`);
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete alert.");
    }
  }

  async function runEvaluation() {
    if (!activeWorkspaceId) return;
    setIsEvaluating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await api.evaluateAlerts(activeWorkspaceId);
      const map: Record<string, AlertEvaluationItem> = {};
      for (const item of res.alerts) { map[item.id] = item; }
      setEvaluations(map);
      const triggered = res.alerts.filter((a) => a.triggered).length;
      setSuccessMessage(
        triggered > 0
          ? `${triggered} alert${triggered !== 1 ? "s" : ""} TRIGGERED of ${res.alerts.length} evaluated.`
          : `All ${res.alerts.length} alerts normal.`
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to evaluate alerts.");
    } finally {
      setIsEvaluating(false);
    }
  }

  const needsCompetitor = newMetric === "competitor_negative_percentage" || newMetric === "competitor_mentions";

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
              <Bell size={24} color="var(--brand)" /> Configurable Alerts
            </h1>
            <p className="page-subtitle">Automated threshold triggers on real sentiment and complaint metrics.</p>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            {alerts.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={runEvaluation}
                disabled={isEvaluating}
              >
                {isEvaluating ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Activity size={16} /></motion.div> Evaluating...</> : <><Play size={16} /> Evaluate Alerts</>}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus size={16} /> Create Alert
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

        {/* Create form */}
        <AnimatePresence>
          {showCreateForm && (
            <FadeIn>
              <div className="card" style={{ marginBottom: "2rem" }}>
                <div className="card-header">
                  <div className="card-title">New Alert Rule</div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateForm(false)}>Cancel</button>
                </div>
                <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>
                  <div>
                    <label className="input-label" htmlFor="alert-name">Alert Name *</label>
                    <input
                      className="input"
                      id="alert-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Surge in Complaints"
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                    <div>
                      <label className="input-label">Metric</label>
                      <select className="input" value={newMetric} onChange={(e) => setNewMetric(e.target.value)}>
                        <option value="negative_sentiment_percentage">Negative Sentiment %</option>
                        <option value="complaint_rate">Complaint Rate %</option>
                        <option value="analysis_coverage_percentage">Analysis Coverage %</option>
                        <option value="competitor_negative_percentage">Competitor Negative %</option>
                        <option value="competitor_mentions">Competitor Mentions</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label">Condition</label>
                      <select className="input" value={newOperator} onChange={(e) => setNewOperator(e.target.value)}>
                        <option value="gt">Greater than (&gt;)</option>
                        <option value="gte">Greater than or equal (≥)</option>
                        <option value="lt">Less than (&lt;)</option>
                        <option value="lte">Less than or equal (≤)</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label">Threshold</label>
                      <input
                        className="input"
                        type="number"
                        step="any"
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                    <div>
                      <label className="input-label">Dataset Scope (optional)</label>
                      <select className="input" value={newDatasetId} onChange={(e) => setNewDatasetId(e.target.value)}>
                        <option value="">All Datasets</option>
                        {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    {needsCompetitor && (
                      <div>
                        <label className="input-label">Target Competitor *</label>
                        <select className="input" value={newCompetitorId} onChange={(e) => setNewCompetitorId(e.target.value)} required>
                          <option value="">Select Competitor</option>
                          {competitors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <button type="submit" className="btn btn-primary"><Plus size={16} /> Create Alert</button>
                  </div>
                </form>
              </div>
            </FadeIn>
          )}
        </AnimatePresence>

        {/* Alerts list */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Configured Alerts ({alerts.length})</div>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-state" style={{ marginTop: "2rem" }}>
              <div className="empty-icon"><Bell size={32} /></div>
              <div className="empty-title">No alerts configured</div>
              <div className="empty-description">
                Create alert rules to be notified when sentiment, complaints, or competitor metrics cross thresholds.
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: "1rem" }}
                onClick={() => setShowCreateForm(true)}
              >
                Create First Alert
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto", marginTop: "1rem" }}>
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-strong)", color: "var(--fg-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th style={{ padding: "1rem 0" }}>Status</th>
                    <th style={{ padding: "1rem 0" }}>Name</th>
                    <th style={{ padding: "1rem 0" }}>Rule</th>
                    <th style={{ padding: "1rem 0" }}>Scope</th>
                    <th style={{ padding: "1rem 0" }}>Current Value</th>
                    <th style={{ padding: "1rem 0" }}>Result</th>
                    <th style={{ padding: "1rem 0" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => {
                    const evalItem = evaluations[alert.id];
                    const datasetName = datasets.find((d) => d.id === alert.dataset_id)?.name;
                    const compName = competitors.find((c) => c.id === alert.competitor_id)?.name;

                    return (
                      <tr key={alert.id} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.95rem" }}>
                        <td style={{ padding: "1rem 0" }}>
                          <button
                            type="button"
                            onClick={() => toggleEnabled(alert)}
                            style={{ 
                              padding: "0.25rem 0.5rem", 
                              fontSize: "0.75rem", 
                              fontWeight: 700, 
                              borderRadius: "var(--radius-sm)", 
                              background: alert.enabled ? "var(--success-bg)" : "var(--border)", 
                              color: alert.enabled ? "var(--success-fg)" : "var(--fg-muted)",
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            {alert.enabled ? "Active" : "Disabled"}
                          </button>
                        </td>
                        <td style={{ padding: "1rem 0", fontWeight: 700, color: "var(--fg)" }}>
                          {editingId === alert.id ? (
                            <input
                              className="input"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          ) : (
                            alert.name
                          )}
                        </td>
                        <td style={{ padding: "1rem 0" }}>
                          {editingId === alert.id ? (
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <select
                                className="input"
                                value={editOperator}
                                onChange={(e) => setEditOperator(e.target.value)}
                                style={{ width: "5rem", padding: "0.5rem" }}
                              >
                                <option value="gt">&gt;</option>
                                <option value="gte">≥</option>
                                <option value="lt">&lt;</option>
                                <option value="lte">≤</option>
                              </select>
                              <input
                                className="input"
                                type="number"
                                step="any"
                                value={editThreshold}
                                onChange={(e) => setEditThreshold(Number(e.target.value))}
                                style={{ width: "5rem", padding: "0.5rem" }}
                              />
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.9rem" }}>
                              {METRIC_LABELS[alert.metric] ?? alert.metric}{" "}
                              <strong>{OPERATOR_SYMBOLS[alert.operator] ?? alert.operator} {alert.threshold}</strong>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "1rem 0" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--fg-muted)" }}>
                            {datasetName ?? "Workspace-wide"}
                            {compName ? ` · ${compName}` : ""}
                          </span>
                        </td>
                        <td style={{ padding: "1rem 0" }}>
                          {evalItem ? (
                            evalItem.current_value != null ? (
                              <strong style={{ fontSize: "1rem", color: "var(--fg)" }}>{evalItem.current_value}</strong>
                            ) : (
                              <span style={{ color: "var(--fg-muted)" }}>No data</span>
                            )
                          ) : (
                            <span style={{ color: "var(--fg-muted)" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "1rem 0" }}>
                          {!alert.enabled ? (
                            <span style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontWeight: 700, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", color: "var(--fg-muted)" }}>Disabled</span>
                          ) : evalItem ? (
                            evalItem.triggered ? (
                              <span style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontWeight: 700, borderRadius: "var(--radius-sm)", background: "var(--danger-bg)", color: "var(--danger-fg)" }}>TRIGGERED</span>
                            ) : (
                              <span style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontWeight: 700, borderRadius: "var(--radius-sm)", background: "var(--success-bg)", color: "var(--success-fg)" }}>NORMAL</span>
                            )
                          ) : (
                            <span style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontWeight: 700, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", color: "var(--fg-muted)" }}>Not evaluated</span>
                          )}
                        </td>
                        <td style={{ padding: "1rem 0" }}>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            {editingId === alert.id ? (
                              <>
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEdit(alert)}>Save</button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setEditingId(alert.id);
                                    setEditName(alert.name);
                                    setEditOperator(alert.operator);
                                    setEditThreshold(alert.threshold);
                                    setEditEnabled(alert.enabled);
                                  }}
                                >
                                  <Edit2 size={14} /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleDelete(alert)}
                                  style={{ color: "var(--danger-fg)", borderColor: "var(--danger-bg)", background: "var(--danger-bg)" }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageTransition>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <AlertsContent />
      </AppShell>
    </AuthGuard>
  );
}
