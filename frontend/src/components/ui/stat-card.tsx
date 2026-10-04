"use client";

import { motion } from "framer-motion";

/* ── Sparkline (tiny SVG chart for KPI cards) ────────────────────────── */
function Sparkline({
  data,
  color = "var(--brand)",
  width = 80,
  height = 28,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = pad + (height - 2 * pad) - ((val - min) / range) * (height - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");

  // Area fill path
  const areaPath =
    `M0,${height} ` +
    data
      .map((val, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = pad + (height - 2 * pad) - ((val - min) / range) * (height - 2 * pad);
        return `L${x},${y}`;
      })
      .join(" ") +
    ` L${width},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`spark-grad-${color.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#spark-grad-${color.replace(/[^a-zA-Z0-9]/g, "")})`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/* ── StatCard ────────────────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  change,
  trendData = [],
  color = "var(--brand)",
  icon,
}: {
  label: string;
  value: string | number;
  change?: number;
  trendData?: number[];
  color?: string;
  icon?: React.ReactNode;
}) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      className="kpi-card card-gold"
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      <div className="kpi-header">
        <div className="kpi-title">{label}</div>
        {icon && <div className="kpi-icon">{icon}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "0.5rem" }}>
        <div>
          <div className="kpi-value">{value}</div>
          {change !== undefined && (
            <div className="kpi-footer">
              <span className={isPositive ? "kpi-badge-positive" : "kpi-badge-negative"}>
                {isPositive ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
              </span>
              <span>vs prev.</span>
            </div>
          )}
        </div>
        {trendData.length > 1 && (
          <div style={{ width: 80, height: 28 }}>
            <Sparkline data={trendData} color={color} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
