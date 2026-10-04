"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Search as SearchIcon, Database, ArrowRight, Loader2, MessageSquareText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/motion";
import { SentimentBadge } from "@/components/ui/sentiment-badge";
import { api, ApiError, type Dataset, type SemanticSearchResult } from "@/lib/api";

const EXAMPLE_QUERIES = [
  "What are customers complaining about?",
  "What do customers dislike most about delivery?",
  "Which features do users find confusing?",
  "What are the most common positive experiences?",
];

function SearchContent() {
  const { workspaces } = useAuth();
  const workspace = workspaces.find((w) => w.role === "owner") ?? workspaces[0];
  const workspaceId = workspace?.id ?? "";

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(10);
  const [results, setResults] = useState<SemanticSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    api.listDatasets(workspaceId).then(setDatasets).catch(() => undefined);
  }, [workspaceId]);

  async function handleSearch(e: FormEvent | null, overrideQuery?: string) {
    e?.preventDefault();
    const q = overrideQuery ?? query;
    if (!q.trim()) return;
    if (overrideQuery) setQuery(overrideQuery);
    setError(null);
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await api.semanticSearch({
        workspace_id: workspaceId,
        query: q.trim(),
        top_k: topK,
        ...(selectedDataset ? { dataset_id: selectedDataset } : {}),
      });
      setResults(res.results);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Semantic search failed.";
      if (err instanceof ApiError && (err.code === "INDEX_UNAVAILABLE" || err.status === 503)) {
        setError("Semantic index is not available. Build an index from the Datasets page first.");
      } else {
        setError(msg);
      }
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="page-content">
      <PageTransition>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: "2rem" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <SearchIcon size={24} color="var(--brand)" /> Semantic Search
            </h1>
            <p className="page-subtitle">Find relevant customer feedback by meaning, not just keywords.</p>
          </div>
          {datasets.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <select
                className="input"
                style={{ padding: "0.5rem 2.5rem 0.5rem 1rem", backgroundPosition: "right 0.75rem center" }}
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                aria-label="Filter by dataset"
              >
                <option value="">All Datasets</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--fg-muted)", fontSize: "0.85rem" }}>
                <span>Top:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input"
                  style={{ width: "4.5rem", padding: "0.5rem" }}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        {/* No datasets */}
        {datasets.length === 0 && (
          <FadeIn>
            <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px dashed var(--border-strong)" }}>
              <Database size={40} color="var(--fg-subtle)" style={{ margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--fg)", marginBottom: "0.5rem" }}>No datasets available</h3>
              <p style={{ color: "var(--fg-muted)", maxWidth: 400, margin: "0 auto 1.5rem" }}>Upload a feedback dataset and build a semantic index to enable search.</p>
              <Link href="/datasets" className="btn btn-primary" style={{ display: "inline-flex" }}>
                Go to Datasets <ArrowRight size={16} />
              </Link>
            </div>
          </FadeIn>
        )}

        {/* Search Input */}
        {(datasets.length > 0 || hasSearched) && (
          <FadeIn delay={0.1}>
            <form onSubmit={handleSearch} style={{ position: "relative", marginBottom: "2rem" }}>
              <SearchIcon size={20} color="var(--fg-muted)" style={{ position: "absolute", left: "1.25rem", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                className="input"
                style={{ width: "100%", padding: "1.25rem 1.25rem 1.25rem 3.5rem", fontSize: "1.1rem", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}
                placeholder="Ask a question about your feedback..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSearching}
                style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", padding: "0.75rem 1.5rem" }}
              >
                {isSearching ? <Loader2 size={18} className="animate-spin" /> : "Search"}
              </button>
            </form>

            {!hasSearched && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--fg-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Example Queries</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  {EXAMPLE_QUERIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSearch(null, q)}
                      style={{ padding: "0.5rem 1rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", fontSize: "0.85rem", color: "var(--fg-2)", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--fg-2)"; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </FadeIn>
        )}

        {/* Results */}
        {hasSearched && (
          <div style={{ marginTop: "2rem" }}>
            {error ? (
              <div style={{ padding: "1.5rem", background: "var(--danger-bg)", color: "var(--danger-fg)", border: "1px solid var(--danger-border)", borderRadius: "var(--radius-md)" }}>
                {error}
              </div>
            ) : results && results.length > 0 ? (
              <StaggerContainer style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ fontSize: "0.9rem", color: "var(--fg-muted)", marginBottom: "0.5rem" }}>
                  Found {results.length} relevant results
                </div>
                {results.map((res) => (
                  <FadeIn key={res.feedback_id}>
                    <div className="card" style={{ padding: "1.5rem", display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <MessageSquareText size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "1.05rem", color: "var(--fg)", lineHeight: 1.6, marginBottom: "1rem" }}>
                          "{res.text}"
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand)", padding: "0.25rem 0.5rem", background: "var(--brand-light)", borderRadius: "var(--radius-sm)" }}>
                            Score: {(res.similarity_score * 100).toFixed(1)}%
                          </span>
                          {res.rating !== null && (
                            <span style={{ fontSize: "0.85rem", color: "var(--fg-muted)" }}>⭐ {res.rating}/5</span>
                          )}
                          <div style={{ marginLeft: "auto", display: "flex", gap: "1rem" }}>
                            <Link href={`/feedback/${res.feedback_id}`} style={{ fontSize: "0.85rem", color: "var(--brand)", fontWeight: 500, textDecoration: "none" }}>
                              View Analysis →
                            </Link>
                            <Link href={`/datasets/${res.dataset_id}`} style={{ fontSize: "0.85rem", color: "var(--fg-muted)", fontWeight: 500, textDecoration: "none" }}>
                              View Dataset
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </StaggerContainer>
            ) : (
              <FadeIn>
                <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px dashed var(--border-strong)" }}>
                  <SearchIcon size={40} color="var(--fg-subtle)" style={{ margin: "0 auto 1rem" }} />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--fg)", marginBottom: "0.5rem" }}>No matching results</h3>
                  <p style={{ color: "var(--fg-muted)", maxWidth: 400, margin: "0 auto" }}>Try rephrasing your query or selecting a different dataset.</p>
                </div>
              </FadeIn>
            )}
          </div>
        )}
      </PageTransition>
    </div>
  );
}

export default function SearchPage() {
  return (
    <AuthGuard>
      <AppShell>
        <SearchContent />
      </AppShell>
    </AuthGuard>
  );
}
