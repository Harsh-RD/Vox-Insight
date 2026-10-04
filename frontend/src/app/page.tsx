"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Globe,
  MessageSquareText,
  Search,
  Shield,
  Zap,
  Users,
  Bell,
  Check,
  TrendingUp,
  PieChart,
  LineChart,
  Database,
  Play,
  Loader2,
  Sparkles,
  Cpu
} from "lucide-react";

import { ParticleNetwork } from "@/components/ui/particle-network";
import { api } from "@/lib/api";
import Logo from "@/components/logo";

/* ── Scroll reveal hook ──────────────────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Feature data ────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: PieChart,
    title: "Advanced Sentiment Distributions",
    desc: "Break down customer sentiment into nuanced aspects. Understand exactly what drives positivity or negativity in your product features.",
    colSpan: "bento-col-8",
    color: "var(--brand)"
  },
  {
    icon: LineChart,
    title: "Real-Time Trends",
    desc: "Monitor sentiment shifts over days, weeks, and months to measure product launch impact.",
    colSpan: "bento-col-4",
    color: "var(--chart-teal)"
  },
  {
    icon: Shield,
    title: "Complaint Triage Alerts",
    desc: "Automatically flag critical complaints before they escalate into churn.",
    colSpan: "bento-col-4",
    color: "var(--chart-rose)"
  },
  {
    icon: Users,
    title: "Competitor Intelligence",
    desc: "Automatically detect competitor mentions in your feedback and benchmark sentiment head-to-head.",
    colSpan: "bento-col-8",
    color: "var(--chart-violet)"
  },
];

/* ── Pricing ─────────────────────────────────────────────────────────── */
const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "For individual researchers and small projects.",
    features: [
      "1 workspace",
      "5 datasets",
      "1,000 feedback records",
      "Basic sentiment analysis",
      "CSV upload",
    ],
    cta: "Get Started Free",
    featured: false,
  },
  {
    name: "Pro",
    price: "₹3,999",
    period: "/mo",
    desc: "For growing teams that need deep insights.",
    features: [
      "5 workspaces",
      "Unlimited datasets",
      "50,000 feedback records",
      "Full NLP pipeline + ABSA",
      "FAISS semantic search",
      "AI Assistant (RAG)",
      "Competitor analysis",
      "Smart alerts",
      "Priority support",
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For organisations with custom requirements.",
    features: [
      "Unlimited everything",
      "Custom NLP models",
      "SSO / SAML",
      "Dedicated infrastructure",
      "SLA guarantee",
      "White-label option",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

const STATS = [
  { value: "Real-time", label: "Intelligence Engine" },
  { value: "High", label: "Classification Accuracy" },
  { value: "Native", label: "Multilingual Support" },
  { value: "24/7", label: "Always-on Monitoring" },
];

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);

  const [demoText, setDemoText] = useState("The app crashes every time I try to checkout. Please fix this immediately, it's so frustrating!");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  async function handleRunDemo() {
    if (!demoText.trim()) return;
    setDemoLoading(true);
    setDemoError(null);
    setDemoResult(null);
    try {
      const res = await api.analyzeDemo(demoText);
      setDemoResult(res);
    } catch (err: any) {
      setDemoError("Demo analysis failed. The backend might not be running.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", overflow: "hidden" }}>
      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="glass-strong" style={{ 
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1rem 2rem", borderBottom: "1px solid rgba(226, 232, 240, 0.8)" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="brand-mark"><Logo /></div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--fg)", letterSpacing: "-0.03em" }}>
            VoxInsight
          </span>
        </div>
        <div style={{ display: "flex", gap: "2.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--fg-2)" }} className="hidden md:flex">
          <a href="#bi-features" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "var(--brand)"} onMouseOut={e => e.currentTarget.style.color = "var(--fg-2)"}>BI Platform</a>
          <a href="#nlp" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "var(--brand)"} onMouseOut={e => e.currentTarget.style.color = "var(--fg-2)"}>AI Capabilities</a>
          <a href="#pricing" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "var(--brand)"} onMouseOut={e => e.currentTarget.style.color = "var(--fg-2)"}>Pricing</a>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/login" className="btn btn-ghost btn-sm hidden md:inline-flex">
            Log in
          </Link>
          <Link href="/register" className="btn btn-primary btn-sm">
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section style={{ position: "relative", paddingTop: "10rem", paddingBottom: "6rem", textAlign: "center", maxWidth: 1200, margin: "0 auto", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
        
        {/* Animated Background */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: "hidden" }}>
          <ParticleNetwork />
        </div>

        <div style={{ position: "relative", zIndex: 10 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1.25rem", borderRadius: "var(--radius-full)", background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--brand)", fontSize: "0.85rem", fontWeight: 700, marginBottom: "2rem", boxShadow: "var(--shadow-sm)" }}>
              <TrendingUp size={16} /> Data-Driven Business Intelligence
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem, 6vw, 5.5rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, maxWidth: 950, margin: "0 auto 1.5rem", color: "var(--fg)" }}>
            Turn customer feedback into <span style={{ color: "var(--brand)" }}>actionable revenue.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }} style={{ fontSize: "1.25rem", color: "var(--fg-muted)", maxWidth: 700, margin: "0 auto 2.5rem", lineHeight: 1.6, fontWeight: 400 }}>
            Upload raw customer feedback. Our Business Intelligence platform instantly generates executive dashboards, competitor benchmarks, and churn-prevention alerts.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-primary btn-lg" style={{ borderRadius: "var(--radius-full)", padding: "1rem 2.5rem", fontSize: "1.1rem" }}>
              Start your free trial <ArrowRight size={20} style={{ marginLeft: "0.5rem" }}/>
            </Link>
            <a href="#bi-features" className="btn btn-secondary btn-lg" style={{ borderRadius: "var(--radius-full)", padding: "1rem 2.5rem", fontSize: "1.1rem", background: "var(--surface)", border: "1px solid var(--border-strong)" }}>
              See how it works
            </a>
          </motion.div>

          {/* ── Interactive NLP Demo ─────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 60, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ marginTop: "5rem", position: "relative" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-xl)", padding: "0.5rem", boxShadow: "var(--shadow-lg), 0 24px 60px rgba(79, 70, 229, 0.1)", position: "relative", zIndex: 20 }}>
              <div style={{ background: "var(--bg-canvas)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                
                {/* Mock Browser Header */}
                <div style={{ display: "flex", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--border-strong)" }} />
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--border-strong)" }} />
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--border-strong)" }} />
                  </div>
                  <div style={{ margin: "0 auto", padding: "0.4rem 2rem", background: "var(--bg-canvas)", borderRadius: "var(--radius-md)", fontSize: "0.75rem", color: "var(--fg-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Sparkles size={14} color="var(--brand)" /> Live NLP Demo
                  </div>
                </div>

                {/* Demo Body */}
                <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem", textAlign: "left", background: "var(--surface-2)" }}>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                    
                    {/* Input Area */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--fg)" }}>Enter Customer Feedback</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--fg-muted)" }}>Try multiple languages or Hinglish code-mixing.</div>
                      </div>
                      <textarea 
                        className="input"
                        style={{ height: "150px", resize: "none", fontSize: "1rem", padding: "1rem", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)" }}
                        value={demoText}
                        onChange={(e) => setDemoText(e.target.value)}
                        placeholder="Type some customer feedback here..."
                      />
                      <button 
                        className="btn btn-primary" 
                        onClick={handleRunDemo} 
                        disabled={demoLoading || !demoText.trim()}
                        style={{ alignSelf: "flex-start", padding: "0.75rem 1.5rem" }}
                      >
                        {demoLoading ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : <><Play size={18} fill="currentColor" /> Analyze Text</>}
                      </button>
                    </div>

                    {/* Output Area */}
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", minHeight: "260px", boxShadow: "var(--shadow-sm)", position: "relative" }}>
                      
                      {demoError && (
                        <div style={{ padding: "1rem", background: "var(--danger-bg)", color: "var(--danger-fg)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem" }}>
                          {demoError}
                        </div>
                      )}

                      {!demoResult && !demoError && !demoLoading && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--fg-subtle)" }}>
                          <Cpu size={48} opacity={0.5} style={{ marginBottom: "1rem" }} />
                          <div style={{ fontWeight: 600 }}>Awaiting input...</div>
                          <div style={{ fontSize: "0.85rem", textAlign: "center", maxWidth: "200px", marginTop: "0.5rem" }}>Click "Analyze Text" to run the NLP pipeline.</div>
                        </div>
                      )}

                      <AnimatePresence>
                        {demoResult && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--fg)", marginBottom: "1.5rem" }}>Analysis Results</div>
                            
                            <div style={{ display: "grid", gridTemplateColumns: (demoResult.emotion && demoResult.emotion !== "unknown") ? "1fr 1fr" : "1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                              <div style={{ background: "var(--surface-2)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--fg-muted)", marginBottom: "0.5rem" }}>Sentiment</div>
                                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: demoResult.sentiment === "positive" ? "var(--success-fg)" : demoResult.sentiment === "negative" ? "var(--danger-fg)" : "var(--fg)", textTransform: "capitalize" }}>
                                  {demoResult.sentiment}
                                </div>
                              </div>
                              {demoResult.emotion && demoResult.emotion !== "unknown" && (
                                <div style={{ background: "var(--surface-2)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--fg-muted)", marginBottom: "0.5rem" }}>Emotion</div>
                                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--warning-fg)", textTransform: "capitalize" }}>
                                    {demoResult.emotion}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                              <div style={{ padding: "0.35rem 0.75rem", background: "var(--info-bg)", color: "var(--info-fg)", borderRadius: "var(--radius-full)", fontSize: "0.85rem", fontWeight: 600 }}>
                                Lang: {demoResult.language.toUpperCase()}
                              </div>
                              {demoResult.is_complaint && (
                                <div style={{ padding: "0.35rem 0.75rem", background: "var(--danger-bg)", color: "var(--danger-fg)", borderRadius: "var(--radius-full)", fontSize: "0.85rem", fontWeight: 600 }}>
                                  <Shield size={14} style={{ display: "inline", marginRight: "0.25rem" }} /> Complaint Detected
                                </div>
                              )}
                            </div>

                            {demoResult.aspects && demoResult.aspects.length > 0 && (
                              <div style={{ marginTop: "1.5rem" }}>
                                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fg-muted)", marginBottom: "0.75rem" }}>Extracted Aspects</div>
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                  {demoResult.aspects.map((a: any, i: number) => (
                                    <div key={i} style={{ padding: "0.25rem 0.75rem", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", fontWeight: 500, background: "var(--surface)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                      {a.aspect}
                                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.sentiment === "positive" ? "var(--success)" : a.sentiment === "negative" ? "var(--danger)" : "var(--warning)" }} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Row ─────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <RevealSection>
          <section style={{ maxWidth: 1200, margin: "0 auto", padding: "4rem 1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem", textAlign: "center" }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ padding: "1rem" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 800, color: "var(--brand)", letterSpacing: "-0.02em" }}>{s.value}</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--fg-2)", marginTop: "0.5rem" }}>{s.label}</div>
              </div>
            ))}
          </section>
        </RevealSection>
      </div>

      {/* ── BI Features Bento Grid ───────────────────────────────────── */}
      <RevealSection delay={0.1}>
        <section id="bi-features" style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.03em" }}>
              Everything you need for <span style={{ color: "var(--brand)" }}>Business Intelligence</span>
            </h2>
            <p style={{ color: "var(--fg-muted)", maxWidth: 650, margin: "1rem auto 0", fontSize: "1.1rem", lineHeight: 1.6 }}>
              No data science team required. Upload your data, and VoxInsight automatically structures it into actionable insights.
            </p>
          </div>

          <div className="bento-grid">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className={`card ${f.colSpan}`} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "2rem", background: "var(--surface)", border: "1px solid var(--border-strong)" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "var(--radius)", background: "var(--surface-2)", border: `1px solid ${f.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color, boxShadow: `0 4px 12px ${f.color}15` }}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--fg)", fontFamily: "var(--font-display)", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>
                      {f.title}
                    </h3>
                    <p style={{ fontSize: "0.95rem", color: "var(--fg-muted)", lineHeight: 1.6, fontWeight: 400 }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </RevealSection>

      {/* ── Core AI Section ────────────────────────────────────────────── */}
      <div style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <RevealSection>
          <section id="nlp" style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Under The Hood</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.03em", marginBottom: "1.5rem", lineHeight: 1.1 }}>
                Powered by state-of-the-art Multilingual NLP.
              </h2>
              <p style={{ color: "var(--fg-2)", fontSize: "1.1rem", lineHeight: 1.7, marginBottom: "2rem" }}>
                VoxInsight doesn't just read English. Our custom XLM-RoBERTa pipeline natively understands Hindi, Hinglish code-mixing, and 120+ other languages. It identifies the root cause of emotions, extracts specific entities, and indexes everything into a high-dimensional FAISS vector database.
              </p>
              <ul style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  "Semantic Vector Search (Find by meaning, not keywords)",
                  "Retrieval-Augmented Generation (Chat with your data)",
                  "Automatic Script Detection (Devanagari / Latin)",
                  "8-Class Emotion Detection (Plutchik's Wheel)"
                ].map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.95rem", fontWeight: 600, color: "var(--fg)" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={14} strokeWidth={3} /></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Visual representation of NLP */}
            <div style={{ position: "relative", height: "400px", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-xl)", padding: "2rem", boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ padding: "1rem", background: "var(--surface-2)", border: "1px dashed var(--border-strong)", borderRadius: "var(--radius)", fontSize: "0.9rem", color: "var(--fg-muted)", fontStyle: "italic" }}>
                  "App bahut slow hai, aur payment fail ho gaya. Fix this asap!"
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}><ArrowRight size={20} color="var(--border-strong)" style={{ transform: "rotate(90deg)" }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div style={{ padding: "0.75rem", background: "var(--danger-bg)", color: "var(--danger-fg)", borderRadius: "var(--radius)", fontSize: "0.8rem", fontWeight: 700, textAlign: "center" }}>Sentiment: Negative</div>
                  <div style={{ padding: "0.75rem", background: "var(--warning-bg)", color: "var(--warning-fg)", borderRadius: "var(--radius)", fontSize: "0.8rem", fontWeight: 700, textAlign: "center" }}>Emotion: Anger</div>
                  <div style={{ padding: "0.75rem", background: "var(--info-bg)", color: "var(--info-fg)", borderRadius: "var(--radius)", fontSize: "0.8rem", fontWeight: 700, textAlign: "center" }}>Language: Hinglish</div>
                  <div style={{ padding: "0.75rem", background: "var(--brand-light)", color: "var(--brand)", borderRadius: "var(--radius)", fontSize: "0.8rem", fontWeight: 700, textAlign: "center" }}>Entity: Payment</div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>
      </div>

      {/* ── Pricing ───────────────────────────────────────────────── */}
      <RevealSection>
        <section id="pricing" style={{ maxWidth: 1100, margin: "0 auto", padding: "6rem 1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 800, textAlign: "center", marginBottom: "0.75rem", color: "var(--fg)", letterSpacing: "-0.02em" }}>
            Simple, transparent pricing
          </h2>
          <p style={{ textAlign: "center", color: "var(--fg-muted)", maxWidth: 500, margin: "0 auto 4rem", fontSize: "1.1rem" }}>
            Start free. Upgrade when you need more power.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", alignItems: "stretch" }}>
            {PLANS.map((plan) => (
              <div key={plan.name} className={`card ${plan.featured ? "card-primary" : ""}`} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "2rem", background: plan.featured ? "var(--surface)" : "var(--surface-2)", position: "relative", overflow: "hidden", border: plan.featured ? "2px solid var(--brand)" : "1px solid var(--border-strong)" }}>
                {plan.featured && (
                  <div style={{ position: "absolute", top: 12, right: -30, background: "var(--brand)", color: "white", fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 3rem", transform: "rotate(45deg)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Popular</div>
                )}
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: plan.featured ? "var(--brand)" : "var(--fg-2)", marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
                    {plan.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.04em" }}>{plan.price}</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--fg-muted)", fontWeight: 500 }}>{plan.period}</span>
                  </div>
                  <p style={{ fontSize: "0.9rem", color: "var(--fg-muted)", marginTop: "0.75rem", lineHeight: 1.5 }}>
                    {plan.desc}
                  </p>
                </div>
                <div style={{ height: "1px", background: "var(--border)", margin: "0.5rem 0" }} />
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.9rem", color: "var(--fg-2)", fontWeight: 500 }}>
                      <Check size={16} strokeWidth={3} style={{ color: "var(--success-fg)", flexShrink: 0, marginTop: "2px" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`btn ${plan.featured ? "btn-primary" : "btn-secondary"} btn-lg`} style={{ width: "100%" }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "4rem 1.5rem 3rem", textAlign: "center", color: "var(--fg-subtle)", fontSize: "0.9rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div className="brand-mark" style={{ width: 32, height: 32, fontSize: "0.8rem", boxShadow: "none" }}><Logo size={16} /></div>
          <span style={{ fontWeight: 800, color: "var(--fg)", fontFamily: "var(--font-display)", fontSize: "1.2rem", letterSpacing: "-0.02em" }}>VoxInsight</span>
        </div>
        <p style={{ maxWidth: 400, margin: "0 auto 2rem", lineHeight: 1.6 }}>Enterprise-grade Multilingual Feedback Intelligence Platform. Turn data into decisions.</p>
        <div style={{ height: "1px", background: "var(--border)", maxWidth: 800, margin: "0 auto 2rem" }} />
        <p>© {new Date().getFullYear()} VoxInsight Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
