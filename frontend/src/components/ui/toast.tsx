"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const ICONS = {
  success: <CheckCircle2 size={20} className="text-emerald-500" style={{ color: "var(--success-fg)" }} />,
  error: <XCircle size={20} className="text-rose-500" style={{ color: "var(--danger-fg)" }} />,
  warning: <AlertCircle size={20} className="text-amber-500" style={{ color: "var(--warning-fg)" }} />,
  info: <Info size={20} className="text-blue-500" style={{ color: "var(--info-fg)" }} />
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(({ type, title, message, duration = 4000 }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 100, display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "400px" }}>
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "1rem",
                boxShadow: "var(--shadow-md)",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
                pointerEvents: "auto",
              }}
            >
              <div style={{ flexShrink: 0, marginTop: "0.1rem" }}>
                {ICONS[t.type]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--fg)" }}>
                  {t.title}
                </div>
                {t.message && (
                  <div style={{ fontSize: "0.85rem", color: "var(--fg-muted)", marginTop: "0.25rem", lineHeight: 1.4 }}>
                    {t.message}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--fg-subtle)",
                  cursor: "pointer",
                  padding: "0.25rem",
                  marginLeft: "0.5rem",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
