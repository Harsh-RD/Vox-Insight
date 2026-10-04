"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Globe, Zap, AlertCircle } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { PublicOnly } from "@/components/public-only";
import { ParticleNetwork } from "@/components/ui/particle-network";
import { api, ApiError } from "@/lib/api";
import Logo from "@/components/logo";

const FLOATING_STATS = [
  { icon: BarChart3, label: "Sentiment Accuracy", value: "94.2%" },
  { icon: Globe, label: "Languages", value: "120+" },
  { icon: Zap, label: "Avg Latency", value: "<100ms" },
];

export default function LoginPage() {
  return (
    <PublicOnly>
      <LoginContent />
    </PublicOnly>
  );
}

function LoginContent() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      {/* ── Brand Panel ───────────────────────────────────────────── */}
      <div className="auth-brand-panel" style={{ position: "relative", overflow: "hidden" }}>
        <ParticleNetwork />
        <div className="hero-grid" style={{ zIndex: 1 }} />

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420 }}
        >
          <div className="brand-mark" style={{ width: 56, height: 56, fontSize: "1.2rem", margin: "0 auto 1.5rem" }}>
            <Logo size={28} />
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.5rem",
              fontWeight: 800,
              marginBottom: "1rem",
              color: "var(--fg)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1
            }}
          >
            Welcome back to <span className="gradient-text">VoxInsight</span>
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--fg-muted)", lineHeight: 1.6, fontWeight: 500, marginBottom: "3rem" }}>
            Your multilingual feedback intelligence platform. Analyze sentiment,
            detect emotions, and uncover insights across 120+ languages.
          </p>

          {/* Floating stat cards */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            {FLOATING_STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="card"
                  style={{ padding: "1rem", textAlign: "center", minWidth: 110, background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)" }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.5rem" }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--fg)", fontFamily: "var(--font-display)" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--fg-muted)", marginTop: "0.15rem", fontWeight: 600 }}>
                    {s.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Form Panel ────────────────────────────────────────────── */}
      <div className="auth-form-panel">
        <motion.form
          className="auth-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ width: "100%", maxWidth: 400 }}
        >
          <div style={{ marginBottom: "2rem", textAlign: "center" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 800, color: "var(--fg)", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>Sign in</h1>
            <p style={{ color: "var(--fg-muted)", fontSize: "0.95rem" }}>
              Enter your credentials to access your workspace.
            </p>
          </div>

          {error && (
            <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", padding: "1rem", borderRadius: "var(--radius)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>
            <div>
              <label htmlFor="login-email" className="input-label">Email</label>
              <input
                id="login-email"
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="input-label" style={{ display: "flex", justifyContent: "space-between" }}>
                Password
                <a href="#" style={{ color: "var(--brand)", fontSize: "0.8rem", textDecoration: "none", fontWeight: 600 }}>Forgot password?</a>
              </label>
              <input
                id="login-password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginBottom: "1.5rem" }}
          >
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Zap size={18} />
              </motion.div>
            ) : (
              <>Sign in <ArrowRight size={18} /></>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.9rem", color: "var(--fg-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "var(--brand)", fontWeight: 700, textDecoration: "none" }}>
              Create one
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
