"use client";

import { useState } from "react";
import { User, Shield, Key, Check, AlertCircle } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { PageTransition, FadeIn } from "@/components/ui/motion";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";

function SettingsContent() {
  const { user, workspaces } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateProfile({ name });
      toast({ type: "success", title: "Profile updated", message: "Your changes have been saved successfully." });
    } catch (err: any) {
      toast({ type: "error", title: "Update failed", message: err instanceof ApiError ? err.message : "Failed to update profile." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ type: "error", title: "Passwords do not match", message: "Please ensure both password fields match." });
      return;
    }
    const currentPass = prompt("Please enter your current password to confirm:");
    if (!currentPass) return;
    
    setLoading(true);
    try {
      await api.updateProfile({ 
        current_password: currentPass, 
        new_password: password 
      });
      setPassword("");
      setConfirmPassword("");
      toast({ type: "success", title: "Password updated", message: "Your password has been changed securely." });
    } catch (err: any) {
      toast({ type: "error", title: "Update failed", message: err instanceof ApiError ? err.message : "Failed to update password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <PageTransition>
        <div className="page-header" style={{ marginBottom: "2rem" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <User size={24} color="var(--brand)" /> Account Settings
            </h1>
            <p className="page-subtitle">Manage your profile, security, and workspace preferences.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <FadeIn>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Profile Information</div>
              </div>
              <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1.5rem" }}>
                <div>
                  <label className="input-label">Full Name</label>
                  <input
                    type="text"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Email Address</label>
                  <input
                    type="email"
                    className="input"
                    value={user?.email || ""}
                    disabled
                    style={{ background: "var(--surface-2)", color: "var(--fg-muted)", cursor: "not-allowed" }}
                  />
                  <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <AlertCircle size={12} /> Contact support to change email address.
                  </div>
                </div>
                <div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Security</div>
              </div>
              <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1.5rem" }}>
                <div>
                  <label className="input-label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    minLength={8}
                    required
                  />
                </div>
                <div>
                  <button type="submit" className="btn btn-secondary" disabled={loading || !password}>
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </FadeIn>

          <FadeIn delay={0.2} className="bento-col-12">
            <div className="card">
              <div className="card-header">
                <div className="card-title">Workspaces</div>
              </div>
              <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {workspaces.map((ws) => (
                  <div key={ws.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface-2)" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--fg)" }}>{ws.name}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--fg-muted)" }}>Role: {ws.role}</div>
                    </div>
                    {ws.role === "owner" && (
                      <span style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontWeight: 700, borderRadius: "var(--radius-sm)", background: "var(--brand-light)", color: "var(--brand)" }}>
                        Current Workspace
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </PageTransition>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <SettingsContent />
      </AppShell>
    </AuthGuard>
  );
}
