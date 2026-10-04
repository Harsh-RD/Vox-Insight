"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ content, children, position = "top", delay = 0.2 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  let posStyle: React.CSSProperties = {};
  let initialAnim = {};
  
  switch (position) {
    case "top":
      posStyle = { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: "8px" };
      initialAnim = { opacity: 0, y: 5 };
      break;
    case "bottom":
      posStyle = { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "8px" };
      initialAnim = { opacity: 0, y: -5 };
      break;
    case "left":
      posStyle = { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: "8px" };
      initialAnim = { opacity: 0, x: 5 };
      break;
    case "right":
      posStyle = { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: "8px" };
      initialAnim = { opacity: 0, x: -5 };
      break;
  }

  return (
    <div 
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={initialAnim}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={initialAnim}
            transition={{ duration: 0.15, delay }}
            style={{
              position: "absolute",
              ...posStyle,
              background: "var(--fg)",
              color: "var(--bg)",
              padding: "0.4rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.75rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 50,
              boxShadow: "var(--shadow-md)"
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
