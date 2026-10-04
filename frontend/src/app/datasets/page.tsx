"use client";

import Link from "next/link";
import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Plus, Upload, Database, Trash2, BarChart3, X, FileText } from "lucide-react";
import { motion } from "framer-motion";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { PageTransition, StaggerContainer, FadeIn, DrawerWrapper } from "@/components/ui/motion";
import { StatusBadge } from "@/components/ui/sentiment-badge";
import { api, ApiError, type Dataset } from "@/lib/api";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Upload Drawer ───────────────────────────────────────────────────── */
function UploadDrawer({
  workspaceId,
  onSuccess,
  onClose,
}: {
  workspaceId: string;
  onSuccess: (ds: Dataset) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function validateFile(f: File): string | null {
    const validExts = [".csv", ".xlsx", ".json", ".txt"];
    if (
      !validExts.some((ext) => f.name.toLowerCase().endsWith(ext)) &&
      !f.type.includes("csv") &&
      !f.type.includes("json") &&
      !f.type.includes("excel") &&
      !f.type.includes("spreadsheet") &&
      !f.type.includes("text")
    ) {
      return "Only CSV, Excel, JSON, and Text files are supported.";
    }
    if (f.size > MAX_UPLOAD_BYTES) return `File too large (${formatBytes(f.size)}). Max ${formatBytes(MAX_UPLOAD_BYTES)}.`;
    return null;
  }

  function onFileSelect(f: File) {
    const err = validateFile(f);
    if (err) { setUploadError(err); return; }
    setFile(f);
    setUploadError(null);
    if (!name) setName(f.name.replace(/\.(csv|xlsx|json|txt)$/i, "").replace(/[_-]/g, " "));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileSelect(f);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setUploadError(null);
    setUploading(true);
    try {
      const dataset = await api.createDataset({ workspace_id: workspaceId, name: name.trim() });
      const summary = await api.uploadDatasetCsv(dataset.id, file);
      setUploadResult(
        `Imported ${summary.rows_imported.toLocaleString()} of ${summary.rows_read.toLocaleString()} rows` +
          (summary.rows_skipped > 0 ? `, skipped ${summary.rows_skipped} invalid rows.` : ".")
      );
      onSuccess(summary.dataset);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (uploadResult) {
    return (
      <>
        <div className="drawer-header" style={{ display: "flex", justifyContent: "space-between", padding: "1.5rem", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>Upload Complete</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)" }}><X size={20} /></button>
        </div>
        <div style={{ textAlign: "center", padding: "3rem 1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--success-bg)", color: "var(--success-fg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
            <Database size={32} />
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--fg)", marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
            Upload successful
          </div>
          <div style={{ fontSize: "0.95rem", color: "var(--fg-muted)", marginBottom: "2rem", lineHeight: 1.5 }}>
            {uploadResult}
          </div>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", width: "100%" }}>
            <button className="btn btn-secondary" onClick={() => { setFile(null); setName(""); setUploadResult(null); }} style={{ flex: 1 }}>
              Upload Another
            </button>
            <button className="btn btn-primary" onClick={onClose} style={{ flex: 1 }}>Done</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="drawer-header" style={{ display: "flex", justifyContent: "space-between", padding: "1.5rem", borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>Upload Dataset</h3>
        <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)" }}><X size={20} /></button>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.5rem" }}>
        
        <div>
          <label htmlFor="ds-name" className="input-label">Dataset name *</label>
          <input id="ds-name" className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Customer Reviews" required maxLength={255} />
        </div>

        <div>
          <label className="input-label">File (CSV, Excel, JSON, TXT)</label>
          <div
            className={`upload-zone${dragOver ? " drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "var(--brand)" : "var(--border-strong)"}`,
              borderRadius: "var(--radius-lg)",
              padding: "3rem 1.5rem",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "var(--brand-light)" : "var(--surface-2)",
              transition: "all 0.2s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem"
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,.xlsx,.json,.txt"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = ""; }}
            />
            {file ? (
              <>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={24} /></div>
                <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--fg)" }}>{file.name}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--fg-muted)" }}>{formatBytes(file.size)} · Click to change</div>
              </>
            ) : (
              <>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--surface)", color: "var(--fg-muted)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-sm)" }}><Upload size={20} /></div>
                <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--fg)" }}>Drop your file here or click to browse</div>
                <div style={{ fontSize: "0.85rem", color: "var(--fg-muted)" }}>Max {formatBytes(MAX_UPLOAD_BYTES)}</div>
              </>
            )}
          </div>
        </div>

        {uploadError && <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", padding: "1rem", borderRadius: "var(--radius)", fontSize: "0.85rem" }}>{uploadError}</div>}

        <button type="submit" className="btn btn-primary btn-lg" disabled={uploading || !file || !name.trim()} style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}>
          {uploading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Upload size={18} /></motion.div>
          ) : (
            <><Upload size={18} /> Upload & Import</>
          )}
        </button>
      </form>
    </>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
function DatasetsContent() {
  const { workspaces } = useAuth();
  const workspace = workspaces.find((w) => w.role === "owner") ?? workspaces[0];
  const workspaceId = workspace?.id ?? "";

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    api.listDatasets(workspaceId).then(setDatasets).catch((e) => setError(e instanceof Error ? e.message : "Failed")).finally(() => setLoading(false));
  }, [workspaceId]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this dataset and all its feedback?")) return;
    setDeletingId(id);
    try {
      await api.deleteDataset(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAnalyze(id: string) {
    try {
      await api.analyzeDataset(id);
      setDatasets((prev) => prev.map((d) => (d.id === id ? { ...d, status: "processing" } : d)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Analysis failed.");
    }
  }

  if (loading) {
    return <div className="page-content" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><div className="animate-spin"><Upload size={32} color="var(--brand)" /></div></div>;
  }

  return (
    <div className="page-content">
      <PageTransition>
        <div className="page-header">
          <div>
            <h1 className="page-title">Datasets</h1>
            <p className="page-subtitle">Manage your feedback datasets and trigger NLP analysis.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Plus size={16} /> New Dataset
          </button>
        </div>

        {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", padding: "1rem", borderRadius: "var(--radius)", marginBottom: "1.5rem" }}>{error}</div>}

        {datasets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Database size={32} /></div>
            <div className="empty-title">No datasets yet</div>
            <div className="empty-description">Upload a CSV to start analyzing customer feedback.</div>
            <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => setShowUpload(true)}>
              <Upload size={16} /> Upload Dataset
            </button>
          </div>
        ) : (
          <StaggerContainer className="bento-grid">
            {datasets.map((ds) => (
              <FadeIn key={ds.id} className="bento-col-6">
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <Link href={`/datasets/${ds.id}`} style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--fg)", fontFamily: "var(--font-display)", textDecoration: "none" }}>
                        {ds.name}
                      </Link>
                      {ds.description && (
                        <p style={{ fontSize: "0.85rem", color: "var(--fg-muted)", marginTop: "0.25rem" }}>{ds.description}</p>
                      )}
                    </div>
                    <StatusBadge status={ds.status} />
                  </div>

                  <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "var(--fg-muted)", background: "var(--surface-2)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
                    <span><strong style={{ color: "var(--fg)", fontWeight: 700 }}>{ds.row_count.toLocaleString()}</strong> rows</span>
                    {ds.source && <span>Source: {ds.source}</span>}
                    <span>{new Date(ds.created_at).toLocaleDateString()}</span>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "auto", paddingTop: "0.5rem" }}>
                    <Link href={`/datasets/${ds.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                      View Feedback
                    </Link>
                    <button className="btn btn-primary btn-sm" onClick={() => handleAnalyze(ds.id)} style={{ flex: 1 }}>
                      <BarChart3 size={14} /> Analyze
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(ds.id)}
                      disabled={deletingId === ds.id}
                      style={{ padding: "0.4rem 0.6rem" }}
                    >
                      {deletingId === ds.id ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Trash2 size={14} /></motion.div> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </FadeIn>
            ))}
          </StaggerContainer>
        )}

        {/* Upload Drawer */}
        <DrawerWrapper isOpen={showUpload} onClose={() => setShowUpload(false)}>
          <UploadDrawer
            workspaceId={workspaceId}
            onSuccess={(ds) => { setDatasets((prev) => [ds, ...prev]); }}
            onClose={() => setShowUpload(false)}
          />
        </DrawerWrapper>
      </PageTransition>
    </div>
  );
}

export default function DatasetsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <DatasetsContent />
      </AppShell>
    </AuthGuard>
  );
}
