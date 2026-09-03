"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useCallback } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
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
  gte: ">=",
  lt: "<",
  lte: "<=",
};

function AlertsContent() {
  const { workspaces, logout } = useAuth();
  const router = useRouter();
  const selectedWorkspace = workspaces[0];

  const [workspaceId, setWorkspaceId] = useState("");
  const activeWorkspaceId = workspaceId || selectedWorkspace?.id || "";

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, AlertEvaluationItem>>({});
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for creating new alert
  const [name, setName] = useState("");
  const [metric, setMetric] = useState("negative_sentiment_percentage");
  const [operator, setOperator] = useState("gte");
  const [threshold, setThreshold] = useState<number>(50);
  const [targetDatasetId, setTargetDatasetId] = useState<string>("");
  const [targetCompetitorId, setTargetCompetitorId] = useState<string>("");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMetric, setEditMetric] = useState("");
  const [editOperator, setEditOperator] = useState("");
  const [editThreshold, setEditThreshold] = useState<number>(0);
  const [editEnabled, setEditEnabled] = useState(true);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const refreshData = useCallback(async () => {
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
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to load alerts data.");
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
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof ApiError ? caught.message : "Failed to load alerts data.");
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
    if (!activeWorkspaceId || !name.trim()) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await api.createAlert({
        workspace_id: activeWorkspaceId,
        name: name.trim(),
        metric,
        operator,
        threshold: Number(threshold),
        dataset_id: targetDatasetId || undefined,
        competitor_id: targetCompetitorId || undefined,
        enabled: true,
      });
      setName("");
      setThreshold(50);
      setTargetDatasetId("");
      setTargetCompetitorId("");
      setSuccessMessage("Alert created successfully.");
      await refreshData();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to create alert.");
    }
  }

  async function toggleEnabled(alert: Alert) {
    setError(null);
    try {
      await api.updateAlert(alert.id, { enabled: !alert.enabled });
      await refreshData();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to toggle alert status.");
    }
  }

  function startEdit(alert: Alert) {
    setEditingId(alert.id);
    setEditName(alert.name);
    setEditMetric(alert.metric);
    setEditOperator(alert.operator);
    setEditThreshold(alert.threshold);
    setEditEnabled(alert.enabled);
  }

  async function saveEdit(alert: Alert) {
    setError(null);
    try {
      await api.updateAlert(alert.id, {
        name: editName.trim(),
        metric: editMetric,
        operator: editOperator,
        threshold: Number(editThreshold),
        enabled: editEnabled,
      });
      setEditingId(null);
      setSuccessMessage("Alert updated.");
      await refreshData();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to update alert.");
    }
  }

  async function handleDelete(alert: Alert) {
    if (!confirm(`Are you sure you want to delete alert "${alert.name}"?`)) return;
    setError(null);
    try {
      await api.deleteAlert(alert.id);
      setSuccessMessage(`Alert "${alert.name}" deleted.`);
      await refreshData();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to delete alert.");
    }
  }

  async function runEvaluation() {
    if (!activeWorkspaceId) return;
    setIsEvaluating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await api.evaluateAlerts(activeWorkspaceId);
      const evalMap: Record<string, AlertEvaluationItem> = {};
      for (const item of res.alerts) {
        evalMap[item.id] = item;
      }
      setEvaluations(evalMap);
      setSuccessMessage(`Evaluation complete for ${res.alerts.length} enabled alerts.`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to evaluate alerts.");
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">VoxInsight Business Rules</p>
          <h1>Configurable Alerts</h1>
        </div>
        <div className="header-actions">
          <Link className="secondary-link" href="/dashboard">Dashboard</Link>
          <Link className="secondary-link" href="/datasets">Datasets</Link>
          <Link className="secondary-link" href="/competitors">Competitors</Link>
          <Link className="secondary-link" href="/search">Semantic Search</Link>
          <Link className="secondary-link" href="/chat">Assistant</Link>
          <button className="secondary-button" type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* Workspace Selector & Evaluate Button */}
      <section className="filters-section">
        <div className="filter-group">
          <label htmlFor="alert-workspace">Workspace:</label>
          <select
            id="alert-workspace"
            value={activeWorkspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="filter-select"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={runEvaluation}
          disabled={isEvaluating || alerts.length === 0}
          style={{ marginLeft: "auto" }}
        >
          {isEvaluating ? "Evaluating Rules…" : "Evaluate Alerts"}
        </button>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {successMessage && <div className="upload-summary">{successMessage}</div>}

      {/* Create Alert Section */}
      <section className="workspace-section">
        <h2>Create Business Alert Rule</h2>
        <p className="muted">
          Define automated threshold triggers against real customer sentiment, complaints, or competitor mentions.
        </p>

        <form onSubmit={handleCreate} className="auth-form" style={{ maxWidth: "56rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label>
              Alert Name:
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Surge in Complaints"
                required
              />
            </label>
            <label>
              Metric:
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="filter-select"
              >
                <option value="negative_sentiment_percentage">Negative Sentiment %</option>
                <option value="complaint_rate">Complaint Rate %</option>
                <option value="analysis_coverage_percentage">Analysis Coverage %</option>
                <option value="competitor_negative_percentage">Competitor Negative %</option>
                <option value="competitor_mentions">Competitor Mentions</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label>
              Condition:
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="filter-select"
              >
                <option value="gt">Greater than (&gt;)</option>
                <option value="gte">Greater than or equal (&gt;=)</option>
                <option value="lt">Less than (&lt;)</option>
                <option value="lte">Less than or equal (&lt;=)</option>
              </select>
            </label>
            <label>
              Threshold Value:
              <input
                type="number"
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label>
              Scope to Dataset (optional):
              <select
                value={targetDatasetId}
                onChange={(e) => setTargetDatasetId(e.target.value)}
                className="filter-select"
              >
                <option value="">All Datasets (Workspace-wide)</option>
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
            </label>

            {(metric === "competitor_negative_percentage" || metric === "competitor_mentions") && (
              <label>
                Target Competitor (required for competitor metrics):
                <select
                  value={targetCompetitorId}
                  onChange={(e) => setTargetCompetitorId(e.target.value)}
                  className="filter-select"
                  required
                >
                  <option value="">Select a Competitor</option>
                  {competitors.map((comp) => (
                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <button type="submit" style={{ maxWidth: "12rem" }}>Create Alert</button>
        </form>
      </section>

      {/* Configured Alerts List & Evaluation State */}
      <section className="chart-section" style={{ marginTop: "2rem" }}>
        <h2>Configured Alerts ({alerts.length})</h2>
        {isLoading ? (
          <div className="loading-spinner">Loading alerts…</div>
        ) : alerts.length === 0 ? (
          <p className="muted">No alerts defined yet. Create an alert rule above.</p>
        ) : (
          <div className="feedback-table">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Rule Condition</th>
                  <th>Scope</th>
                  <th>Current Metric</th>
                  <th>Evaluation State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => {
                  const evalItem = evaluations[alert.id];
                  const datasetName = datasets.find((d) => d.id === alert.dataset_id)?.name;
                  const compName = competitors.find((c) => c.id === alert.competitor_id)?.name;

                  return (
                    <tr key={alert.id}>
                      <td>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => toggleEnabled(alert)}
                          style={{
                            minHeight: "1.8rem",
                            padding: "0.2rem 0.5rem",
                            background: alert.enabled ? "#d1fae5" : "#fee2e2",
                            color: alert.enabled ? "#065f46" : "#7f1d1d",
                            fontWeight: 600,
                            borderRadius: "4px",
                          }}
                        >
                          {alert.enabled ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td>
                        {editingId === alert.id ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{ minHeight: "2rem" }}
                          />
                        ) : (
                          <strong>{alert.name}</strong>
                        )}
                      </td>
                      <td>
                        {editingId === alert.id ? (
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <select
                              value={editOperator}
                              onChange={(e) => setEditOperator(e.target.value)}
                              style={{ minHeight: "2rem" }}
                            >
                              <option value="gt">&gt;</option>
                              <option value="gte">&gt;=</option>
                              <option value="lt">&lt;</option>
                              <option value="lte">&lt;=</option>
                            </select>
                            <input
                              type="number"
                              step="any"
                              value={editThreshold}
                              onChange={(e) => setEditThreshold(Number(e.target.value))}
                              style={{ minHeight: "2rem", width: "5rem" }}
                            />
                          </div>
                        ) : (
                          <span>
                            {METRIC_LABELS[alert.metric] ?? alert.metric}{" "}
                            <strong>
                              {OPERATOR_SYMBOLS[alert.operator] ?? alert.operator} {alert.threshold}
                            </strong>
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="muted" style={{ fontSize: "0.85rem" }}>
                          {datasetName ? `Dataset: ${datasetName}` : "Workspace-wide"}
                          {compName ? ` · Comp: ${compName}` : ""}
                        </span>
                      </td>
                      <td>
                        {evalItem ? (
                          evalItem.current_value !== null ? (
                            <strong>{evalItem.current_value}</strong>
                          ) : (
                            <span className="muted">No data</span>
                          )
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {!alert.enabled ? (
                          <span className="role-badge">Disabled</span>
                        ) : evalItem ? (
                          evalItem.triggered ? (
                            <span
                              className="sentiment-badge negative"
                              style={{ fontWeight: "bold", padding: "0.4rem 0.6rem" }}
                            >
                              TRIGGERED
                            </span>
                          ) : (
                            <span
                              className="sentiment-badge positive"
                              style={{ fontWeight: "bold", padding: "0.4rem 0.6rem" }}
                            >
                              NORMAL
                            </span>
                          )
                        ) : (
                          <span className="role-badge">Pending Eval</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          {editingId === alert.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveEdit(alert)}
                                style={{ minHeight: "1.8rem", padding: "0.2rem 0.5rem" }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setEditingId(null)}
                                style={{ minHeight: "1.8rem", padding: "0.2rem 0.5rem" }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => startEdit(alert)}
                                style={{ minHeight: "1.8rem", padding: "0.2rem 0.5rem" }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleDelete(alert)}
                                style={{
                                  minHeight: "1.8rem",
                                  padding: "0.2rem 0.5rem",
                                  color: "var(--danger)",
                                }}
                              >
                                Delete
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
      </section>
    </main>
  );
}

export default function AlertsPage() {
  return (
    <AuthGuard>
      <AlertsContent />
    </AuthGuard>
  );
}
