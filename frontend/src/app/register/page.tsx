"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Lock, Sparkles, AlertCircle, Zap } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { PublicOnly } from "@/components/public-only";
import { ParticleNetwork } from "@/components/ui/particle-network";
import { api, ApiError } from "@/lib/api";
import Logo from "@/components/logo";

export default function RegisterPage() {
  return (
    <PublicOnly>
      <RegisterContent />
    </PublicOnly>
  );
}

function RegisterContent() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const PERKS = [
    { icon: Shield, text: "Workspace isolation & Argon2id password hashing" },
    { icon: Lock, text: "JWT access/refresh tokens with httpOnly cookies" },
    { icon: Sparkles, text: "Personal workspace created automatically" },
  ];

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
            Join <span className="gradient-text">VoxInsight</span>
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--fg-muted)", lineHeight: 1.6, fontWeight: 500 }}>
            Create your free account and start analyzing customer feedback in minutes.
          </p>

          {/* Security perks */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "3rem", textAlign: "left" }}>
            {PERKS.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.text}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem 1.25rem",
                    background: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    fontSize: "0.9rem",
                    color: "var(--fg-2)",
                    fontWeight: 500,
                    boxShadow: "var(--shadow-sm)"
                  }}
                >
                  <Icon size={20} style={{ color: "var(--brand)", flexShrink: 0 }} />
                  {p.text}
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
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 800, color: "var(--fg)", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>Create an account</h1>
            <p style={{ color: "var(--fg-muted)", fontSize: "0.95rem" }}>
              Free tier includes 1 workspace and 1,000 feedback records.
            </p>
          </div>

          {error && (
            <div style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", padding: "1rem", borderRadius: "var(--radius)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>
            <div>
              <label htmlFor="register-name" className="input-label">Full name</label>
              <input
                id="register-name"
                type="text"
                className="input"
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="input-label">Work email</label>
              <input
                id="register-email"
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
              <label htmlFor="register-password" className="input-label">Password</label>
              <input
                id="register-password"
                type="password"
                className="input"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
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
              <>Create account <ArrowRight size={18} /></>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.9rem", color: "var(--fg-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--brand)", fontWeight: 700, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
