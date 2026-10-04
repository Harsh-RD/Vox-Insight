"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  style?: React.CSSProperties;
}

export function Tabs({ tabs, activeTab, onChange, style }: TabsProps) {
  return (
    <div style={{ display: "flex", gap: "1.5rem", borderBottom: "1px solid var(--border)", ...style }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              position: "relative",
              padding: "0.75rem 0.25rem",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--brand)" : "var(--fg-muted)",
              transition: "color 0.2s ease",
            }}
            onMouseOver={(e) => {
              if (!isActive) e.currentTarget.style.color = "var(--fg)";
            }}
            onMouseOut={(e) => {
              if (!isActive) e.currentTarget.style.color = "var(--fg-muted)";
            }}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="active-tab"
                style={{
                  position: "absolute",
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "var(--brand)",
                  borderRadius: "2px 2px 0 0",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
