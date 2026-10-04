"use client";

import { Book, FileText, Search, Settings, ShieldAlert, Cpu } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/motion";

function HelpContent() {
  const SECTIONS = [
    {
      title: "Getting Started",
      icon: Book,
      content: "Upload a CSV file in the Datasets section. Your file must include a 'text' or 'feedback' column. Optional columns: 'source', 'language', 'timestamp'. After uploading, wait for the AI analysis to complete.",
    },
    {
      title: "Semantic Search",
      icon: Search,
      content: "VoxInsight uses FAISS vector embeddings to power semantic search. This means you can search by meaning rather than exact keywords. For example, 'app crashes on startup' will find 'screen goes black when I open the app'.",
    },
    {
      title: "AI Analysis Pipeline",
      icon: Cpu,
      content: "Our custom NLP pipeline performs: Language Detection (120+ languages), Sentiment Analysis (Positive, Neutral, Negative), Emotion Detection (Joy, Anger, Surprise, etc.), and Aspect-Based Sentiment Analysis (ABSA).",
    },
    {
      title: "Competitor Tracking",
      icon: ShieldAlert,
      content: "Add competitors in the Competitors tab along with their aliases. Once configured, you can scan any dataset to automatically detect mentions and benchmark their sentiment against yours.",
    },
    {
      title: "CSV Format Requirements",
      icon: FileText,
      content: "Required: 'text' column containing the feedback. Optional: 'rating' (1-5), 'timestamp' (ISO 8601), 'source' (e.g. App Store, Twitter), 'language' (e.g. en, hi).",
    },
    {
      title: "Account & Workspaces",
      icon: Settings,
      content: "All data is securely isolated by Workspace. A default workspace is created for you. You can update your profile and password in the Settings page.",
    },
  ];

  return (
    <div className="page-content">
      <PageTransition>
        <div className="page-header" style={{ marginBottom: "2rem" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Book size={24} color="var(--brand)" /> Documentation
            </h1>
            <p className="page-subtitle">Learn how to get the most out of VoxInsight.</p>
          </div>
        </div>

        <StaggerContainer className="bento-grid">
          {SECTIONS.map((section, idx) => {
            const Icon = section.icon;
            return (
              <FadeIn key={idx} className="bento-col-6">
                <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={18} />
                    </div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--fg)", fontFamily: "var(--font-display)" }}>
                      {section.title}
                    </h3>
                  </div>
                  <p style={{ color: "var(--fg-2)", fontSize: "0.95rem", lineHeight: 1.6, flex: 1 }}>
                    {section.content}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </StaggerContainer>
      </PageTransition>
    </div>
  );
}

export default function HelpPage() {
  return (
    <AuthGuard>
      <AppShell>
        <HelpContent />
      </AppShell>
    </AuthGuard>
  );
}
