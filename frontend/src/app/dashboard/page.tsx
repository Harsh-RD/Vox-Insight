"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";

function DashboardContent() {
  const { user, workspaces, logout } = useAuth();
  const router = useRouter();
  const personalWorkspace = workspaces.find((workspace) => workspace.role === "owner") ?? workspaces[0];

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">VoxInsight</p>
          <h1>Your workspace</h1>
        </div>
        <div className="header-actions">
          <Link className="secondary-link" href="/datasets">Datasets</Link>
          <button className="secondary-button" type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <section className="welcome-card">
        <p className="muted">Signed in as</p>
        <h2>{user?.name}</h2>
        <p>{user?.email}</p>
      </section>

      <section className="workspace-section" aria-labelledby="workspaces-heading">
        <div>
          <p className="eyebrow">Workspace access</p>
          <h2 id="workspaces-heading">Your workspaces</h2>
        </div>
        {personalWorkspace && <p className="personal-note">Personal workspace: {personalWorkspace.name}</p>}
        <ul className="workspace-list">
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <div>
                <strong>{workspace.name}</strong>
                <span>{workspace.slug}</span>
              </div>
              <span className="role-badge">{workspace.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return <AuthGuard><DashboardContent /></AuthGuard>;
}
