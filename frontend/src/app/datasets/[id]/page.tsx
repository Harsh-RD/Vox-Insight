"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { AuthGuard } from "@/components/auth-guard";
import { api, ApiError, type Dataset, type Feedback, type UploadSummary } from "@/lib/api";

function DatasetDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function load() {
    return Promise.all([api.getDataset(params.id), api.listDatasetFeedback(params.id)])
      .then(([currentDataset, rows]) => { setDataset(currentDataset); setFeedback(rows); })
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Unable to load dataset."));
  }
  useEffect(() => {
    let active = true;
    void Promise.all([api.getDataset(params.id), api.listDatasetFeedback(params.id)])
      .then(([currentDataset, rows]) => { if (active) { setDataset(currentDataset); setFeedback(rows); } })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.message : "Unable to load dataset."); });
    return () => { active = false; };
  }, [params.id]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null); setIsUploading(true);
    try { setSummary(await api.uploadDatasetCsv(params.id, file)); await load(); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Upload failed."); }
    finally { setIsUploading(false); event.target.value = ""; }
  }
  async function deleteDataset() {
    if (!window.confirm("Delete this dataset and its feedback?")) return;
    try { await api.deleteDataset(params.id); router.replace("/datasets"); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Unable to delete dataset."); }
  }
  if (!dataset && !error) return <main className="centered-status">Loading dataset…</main>;
  return <main className="dashboard-page">
    <header className="dashboard-header"><div><p className="eyebrow">Dataset</p><h1>{dataset?.name ?? "Unavailable"}</h1></div><Link className="secondary-link" href="/datasets">All datasets</Link></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {dataset && <><section className="workspace-section"><p className="muted">{dataset.source ?? "No source"} · {dataset.row_count} rows · {dataset.status}</p><div className="header-actions"><label className="upload-label">Upload CSV<input type="file" accept=".csv,text/csv" onChange={onFileChange} disabled={isUploading} /></label><button className="secondary-button" type="button" onClick={deleteDataset}>Delete dataset</button></div>{isUploading && <p className="muted">Importing CSV…</p>}{summary && <p className="upload-summary">Imported {summary.rows_imported} of {summary.rows_read} rows; skipped {summary.rows_skipped} invalid rows.</p>}</section>
    <section className="workspace-section"><h2>Feedback preview</h2><div className="feedback-table"><table><thead><tr><th>Text</th><th>Rating</th><th>Language</th><th>Status</th></tr></thead><tbody>{feedback.map((item) => <tr key={item.id}><td>{item.original_text}</td><td>{item.rating ?? "—"}</td><td>{item.language ?? "—"}</td><td>{item.processing_status}</td></tr>)}</tbody></table></div>{feedback.length === 0 && <p className="muted">Upload a CSV with a text column to preview feedback.</p>}</section></>}
  </main>;
}
export default function DatasetDetailPage() { return <AuthGuard><DatasetDetailContent /></AuthGuard>; }
