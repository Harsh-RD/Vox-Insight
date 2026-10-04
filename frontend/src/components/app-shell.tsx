"use client";

import Link from "next/link";
import Logo from "@/components/logo";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Search,
  MessageSquareText,
  Users,
  Bell,
  LogOut,
  Settings,
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "./auth-provider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/datasets", label: "Datasets", icon: Database },
  { href: "/search", label: "Search", icon: Search },
  { href: "/chat", label: "Assistant", icon: MessageSquareText },
  { href: "/competitors", label: "Competitors", icon: Users },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, workspaces, logout } = useAuth();
  const workspace = workspaces.find((w) => w.role === "owner") ?? workspaces[0];

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <div className="app-shell">
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          {/* Brand */}
          <div className="sidebar-brand">
            <div className="brand-mark"><Logo /></div>
            <span className="brand-name">VoxInsight</span>
          </div>

          {/* Navigation */}
          <nav aria-label="Main navigation" className="sidebar-nav-section">
            <div className="sidebar-section-label">Platform</div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${isActive ? " nav-item--active" : ""}`}
                >
                  <span className="nav-icon">
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  </span>
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-indicator"
                      style={{
                        position: "absolute",
                        left: "-0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 3,
                        height: "60%",
                        background: "var(--brand)",
                        borderRadius: "0 9999px 9999px 0",
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Workspace + User + Sign out */}
        <div className="sidebar-bottom">
          {workspace && (
            <div className="sidebar-workspace">
              <span className="workspace-dot" />
              <span className="workspace-label">{workspace.name}</span>
            </div>
          )}
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name ?? "User"}</div>
              <div className="sidebar-user-role">
                {workspace?.role === "owner" ? "Owner" : "Member"}
              </div>
            </div>
          </div>
          <button
            className="sidebar-signout"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={14} style={{ marginRight: 6 }} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <div className="main-content">
        <header className="top-nav">
          <div className="top-nav-left">
            <div className="top-nav-breadcrumb">
              <span>VoxInsight</span> /{" "}
              {pathname
                .split("/")
                .filter(Boolean)
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                .join(" / ") || "Overview"}
            </div>
          </div>
          <div className="top-nav-right">
            <button className="user-avatar-btn" title="User Profile">
              {initial}
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
