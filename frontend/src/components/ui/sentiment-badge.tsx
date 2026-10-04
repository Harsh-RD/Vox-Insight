"use client";

const SENTIMENT_CONFIG: Record<string, { label: string; className: string }> = {
  positive: { label: "Positive", className: "badge-positive" },
  negative: { label: "Negative", className: "badge-negative" },
  neutral: { label: "Neutral", className: "badge-neutral" },
  unknown: { label: "Unknown", className: "badge-muted" },
};

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config = SENTIMENT_CONFIG[sentiment?.toLowerCase()] ?? SENTIMENT_CONFIG.unknown;
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

/* ── Processing Status Badge ─────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  completed: { label: "Completed", dotClass: "status-dot--success", badgeClass: "badge-positive" },
  processing: { label: "Processing", dotClass: "status-dot--warning", badgeClass: "badge-warning" },
  pending: { label: "Pending", dotClass: "status-dot--info", badgeClass: "badge-neutral" },
  failed: { label: "Failed", dotClass: "status-dot--danger", badgeClass: "badge-negative" },
  indexing: { label: "Indexing", dotClass: "status-dot--warning", badgeClass: "badge-warning" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG.pending;
  return (
    <span className={`badge ${config.badgeClass}`}>
      <span className={`status-dot ${config.dotClass}`} style={{ width: 6, height: 6 }} />
      {config.label}
    </span>
  );
}

/* ── Emotion Badge ───────────────────────────────────────────────────── */
const EMOTION_COLORS: Record<string, string> = {
  joy: "badge-positive",
  sadness: "badge-neutral",
  anger: "badge-negative",
  fear: "badge-warning",
  surprise: "badge-gold",
  disgust: "badge-negative",
  trust: "badge-positive",
  anticipation: "badge-gold",
};

export function EmotionBadge({ emotion }: { emotion: string }) {
  const cls = EMOTION_COLORS[emotion?.toLowerCase()] ?? "badge-muted";
  return <span className={`badge ${cls}`}>{emotion}</span>;
}
