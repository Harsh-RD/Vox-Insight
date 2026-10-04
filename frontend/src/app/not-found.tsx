"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { ParticleNetwork } from "@/components/ui/particle-network";

export default function NotFound() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <ParticleNetwork />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ position: "relative", zIndex: 10, textAlign: "center", background: "rgba(255,255,255,0.8)", padding: "4rem", borderRadius: "var(--radius-xl)", backdropFilter: "blur(24px)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ fontSize: "6rem", fontWeight: 800, color: "var(--brand)", fontFamily: "var(--font-display)", lineHeight: 1, marginBottom: "1rem" }}>
          404
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--fg)", marginBottom: "1rem" }}>
          Page not found
        </h1>
        <p style={{ color: "var(--fg-muted)", fontSize: "1rem", marginBottom: "2.5rem", maxWidth: 300, margin: "0 auto 2.5rem" }}>
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <Link href="/" className="btn btn-primary" style={{ display: "inline-flex" }}>
          <ArrowLeft size={16} /> Return to Home
        </Link>
      </motion.div>
    </div>
  );
}
