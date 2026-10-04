import type { Metadata } from "next";
import { ClientProviders } from "@/components/client-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoxInsight — Multilingual Feedback Intelligence",
  description:
    "Transform multilingual customer feedback into actionable business intelligence. Sentiment analysis, emotion detection, aspect extraction, and AI-powered insights across 120+ languages.",
  keywords: [
    "feedback analytics",
    "sentiment analysis",
    "multilingual NLP",
    "customer intelligence",
    "ABSA",
    "AI assistant",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
