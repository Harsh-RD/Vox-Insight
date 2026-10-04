"use client";

import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * VoxInsight brand logo – a stylised sound-wave / diamond insight mark.
 * Renders as an inline SVG inside the existing `.brand-mark` container so all
 * existing gradient-background + box-shadow styles remain intact.
 *
 * Usage:
 *   <div className="brand-mark"><Logo /></div>
 *   <div className="brand-mark" style={{ width: 56, height: 56 }}><Logo size={28} /></div>
 */
export default function Logo({ size = 20, className, style }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      className={className}
      style={style}
      aria-label="VoxInsight logo"
    >
      {/* Sound-wave bars – representing "Vox" (voice) */}
      <rect x="4" y="14" width="4" height="12" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="11" y="8" width="4" height="24" rx="2" fill="currentColor" opacity="0.85" />
      <rect x="18" y="4" width="4" height="32" rx="2" fill="currentColor" />
      <rect x="25" y="8" width="4" height="24" rx="2" fill="currentColor" opacity="0.85" />
      <rect x="32" y="14" width="4" height="12" rx="2" fill="currentColor" opacity="0.7" />

      {/* Diamond "insight" accent in the center */}
      <path
        d="M20 11 L24 20 L20 29 L16 20 Z"
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
  );
}
