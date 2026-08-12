"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError, type Dataset } from "@/lib/api";

function DatasetsContent() {
  const { workspaces } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const selectedWorkspaceId = workspaceId || workspaces[0]?.id || "";

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    let active = true;
    void api.listDatasets(selectedWorkspaceId)
      .then((items) => { if (active) setDatasets(items); })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.message : "Unable to load datasets."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [selectedWorkspaceId]);

  async function createDataset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const dataset = await api.createDataset({ workspace_id: selectedWorkspaceId, name, source: source || undefined });
      setDatasets((current) => [dataset, ...current]);
      setName("");
      setSource("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to create dataset.");
    }
  }

  return <main className="dashboard-page">
    <header className="dashboard-header"><div><p className="eyebrow">VoxInsight</p><h1>Datasets</h1></div><Link className="secondary-link" href="/dashboard">Workspace</Link></header>
    <section className="workspace-section">
      <h2>Create dataset</h2>
      <form className="inline-form" onSubmit={createDataset}>
        <select value={selectedWorkspaceId} onChange={(event) => setWorkspaceId(event.target.value)} aria-label="Workspace">{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dataset name" required maxLength={255} />
        <input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Source (optional)" maxLength={255} />
        <button type="submit" disabled={!selectedWorkspaceId}>Create dataset</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
    <section className="workspace-section">
      <h2>Workspace datasets</h2>
      {isLoading ? <p className="muted">Loading datasets…</p> : <ul className="workspace-list">{datasets.map((dataset) => <li key={dataset.id}><div><strong><Link href={`/datasets/${dataset.id}`}>{dataset.name}</Link></strong><span>{dataset.source ?? "No source"} · {dataset.row_count} rows · {new Date(dataset.created_at).toLocaleDateString()}</span></div><span className="role-badge">{dataset.status}</span></li>)}</ul>}
      {!isLoading && datasets.length === 0 && <p className="muted">Create a dataset to import feedback.</p>}
    </section>
  </main>;
}

export default function DatasetsPage() { return <AuthGuard><DatasetsContent /></AuthGuard>; }
