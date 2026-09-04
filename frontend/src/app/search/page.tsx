"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError, type SemanticSearchResult } from "@/lib/api";

function SearchContent() {
  const { workspaces } = useAuth();
  const [workspaceId, setWorkspaceId] = useState("");
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(10);
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const selectedWorkspace = workspaceId || workspaces[0]?.id || "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setIsSearching(true);
    try { setResults((await api.semanticSearch({ workspace_id: selectedWorkspace, query, top_k: topK })).results); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Semantic search failed."); }
    finally { setIsSearching(false); }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div><p className="eyebrow">VoxInsight</p><h1>Semantic Search</h1></div>
        <div className="header-actions">
          <Link className="secondary-link" href="/dashboard">Dashboard</Link>
          <Link className="secondary-link" href="/datasets">Datasets</Link>
          <Link className="secondary-link" href="/competitors">Competitors</Link>
          <Link className="secondary-link" href="/alerts">Alerts</Link>
          <Link className="secondary-link" href="/chat">Assistant</Link>
        </div>
      </header>
    <section className="workspace-section"><form className="inline-form" onSubmit={submit}><select value={selectedWorkspace} onChange={(event) => setWorkspaceId(event.target.value)} aria-label="Workspace">{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search feedback semantically" required /><input type="number" min="1" max="100" value={topK} onChange={(event) => setTopK(Number(event.target.value))} aria-label="Results count" /><button type="submit" disabled={!selectedWorkspace || isSearching}>{isSearching ? "Searching..." : "Search"}</button></form>{error && <p className="form-error" role="alert">{error}</p>}</section>
    <section className="workspace-section"><h2>Relevant feedback</h2>{results.length === 0 ? <p className="muted">Build an index from a dataset, then search its workspace.</p> : <ul className="workspace-list">{results.map((result) => <li key={result.feedback_id}><div><strong>{result.text}</strong><span>Dataset {result.dataset_id} / {result.language ?? "language unknown"}</span></div><span className="role-badge">{result.similarity_score.toFixed(3)}</span></li>)}</ul>}</section>
    </main>
  );
}

export default function SemanticSearchPage() { return <AuthGuard><SearchContent /></AuthGuard>; }
