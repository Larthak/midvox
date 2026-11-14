"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Cpu,
  Database,
  Globe,
  Instagram,
  Lock,
  RefreshCw,
  Server,
  Settings,
  Shield,
  Users,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { AdminStats, AdminConfig } from "@/types/api";
import { toast } from "sonner";

type OwnerLogin = {
  id: string;
  service: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const OWNER_LOGINS: OwnerLogin[] = [
  {
    id: "youtube-login-heading",
    service: "YouTube",
    description: "Manage the bot's YouTube session for Shorts downloads.",
    href: "/dashboard/youtube-login",
    icon: Youtube,
  },
  {
    id: "instagram-login-heading",
    service: "Instagram",
    description: "Manage the bot's Instagram session for Reel downloads. Sessions are encrypted.",
    href: "/dashboard/instagram-login",
    icon: Instagram,
  },
  {
    id: "discord-login-heading",
    service: "Discord",
    description: "Sign in to the Discord account used for bumping. Sessions are encrypted.",
    href: "/dashboard/discord-login",
    icon: Users,
  },
];

export function AdminContent({ canManageOwnerLogins = false }: { canManageOwnerLogins?: boolean }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState("");

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [statsData, configData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminConfig()
      ]);
      setStats(statsData);
      setConfig(configData);
      setNotification(configData.global_notification || "");
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
      toast.error("Could not load live admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMaintenance = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const newStatus = !config.maintenance_mode;
      await api.updateAdminConfig({ maintenance_mode: newStatus });
      setConfig({ ...config, maintenance_mode: newStatus });
      toast.success(`Maintenance mode ${newStatus ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error("Could not update maintenance mode");
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async () => {
    setSaving(true);
    try {
      await api.updateAdminConfig({ global_notification: notification });
      if (config) setConfig({ ...config, global_notification: notification });
      toast.success("Broadcast message updated");
    } catch (err) {
      toast.error("Could not update the broadcast message");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-5 w-5 animate-spin text-[var(--panel-accent-deep)]" />
        <p className="text-sm text-[var(--panel-muted)]">Loading admin data…</p>
      </div>
    );
  }

  const statItems = [
    { name: "Total users", value: stats?.total_users || "0", icon: Users },
    { name: "Active servers", value: stats?.active_servers || "0", icon: Server },
    { name: "API latency", value: stats?.api_latency || "0ms", icon: Activity },
    { name: "Database size", value: stats?.db_size || "0 MB", icon: Database },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--panel-accent-deep)]">
            <Shield className="h-3.5 w-3.5" />
            Restricted
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--panel-ink)] sm:text-[28px]">
            Admin panel
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--panel-muted)]">
            Bot health, owner logins, and global announcements. Only MidVox administrators can see this page.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--panel-line)] bg-[var(--panel-paper)] px-4 text-[13px] font-semibold text-[var(--panel-muted)] transition-colors hover:border-[var(--panel-accent)] hover:text-[var(--panel-ink)] disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {canManageOwnerLogins && (
        <section aria-labelledby="owner-logins-heading" className="space-y-3">
          <div>
            <h2 id="owner-logins-heading" className="text-[15px] font-semibold text-[var(--panel-ink)]">
              Bot owner logins
            </h2>
            <p className="mt-1 text-xs text-[var(--panel-muted)]">
              These sessions belong to the bot account, not to your Discord servers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {OWNER_LOGINS.map((login) => (
              <div
                key={login.service}
                className="panel-surface flex flex-col gap-4 rounded-2xl p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-accent-deep)]">
                    <login.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-[var(--panel-ink)]">
                      {login.service} login
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--panel-muted)]">
                      {login.description}
                    </p>
                  </div>
                </div>

                <Link
                  href={login.href}
                  className="mt-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--panel-line)] bg-[var(--panel-raised)] px-4 text-xs font-semibold text-[var(--panel-ink)] transition-colors hover:border-[var(--panel-accent)]"
                >
                  Open login
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statItems.map((stat) => (
          <div key={stat.name} className="panel-surface rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--panel-muted)]">{stat.name}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[var(--panel-ink)]">
                  {stat.value}
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-accent-deep)]">
                <stat.icon className="h-4 w-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="panel-surface overflow-hidden rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-line)] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-[var(--panel-accent-deep)]" />
              <h2 className="text-[15px] font-semibold text-[var(--panel-ink)]">
                System status
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--panel-faint)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Refreshes every 30s
            </span>
          </div>

          <div className="space-y-2 p-5 sm:p-6">
            {stats?.nodes.map((node) => {
              const Icon = node.icon === "Globe" ? Globe : node.icon === "Database" ? Database : node.icon === "Cpu" ? Cpu : Lock;
              const isHealthy = node.status === "Healthy";
              return (
                <div
                  key={node.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] px-3.5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-line)] bg-[var(--panel-paper)] text-[var(--panel-muted)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--panel-ink)]">
                        {node.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--panel-muted)]">
                        Load: {node.load}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      isHealthy
                        ? "panel-status-pill"
                        : "bg-amber-500/10 text-amber-600",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {node.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel-surface rounded-2xl">
          <div className="flex items-center gap-2.5 border-b border-[var(--panel-line)] px-5 py-4">
            <Settings className="h-4 w-4 text-[var(--panel-accent-deep)]" />
            <h2 className="text-[15px] font-semibold text-[var(--panel-ink)]">
              Global settings
            </h2>
          </div>

          <div className="space-y-4 p-5">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[var(--panel-muted)]">
                Maintenance mode
              </p>
              <button
                type="button"
                onClick={handleToggleMaintenance}
                disabled={saving}
                aria-pressed={Boolean(config?.maintenance_mode)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors disabled:opacity-60",
                  config?.maintenance_mode
                    ? "border-red-500/30 bg-red-500/10 text-red-600"
                    : "border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-muted)] hover:border-[var(--panel-accent)]",
                )}
              >
                <span className="text-[13px] font-medium">
                  {config?.maintenance_mode ? "Restricting access" : "Standard operations"}
                </span>
                <span
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                    config?.maintenance_mode ? "bg-red-500" : "bg-[var(--panel-line)]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200",
                      config?.maintenance_mode ? "left-6" : "left-1",
                    )}
                  />
                </span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-notification"
                className="text-xs font-medium text-[var(--panel-muted)]"
              >
                Global notification
              </label>
              <textarea
                id="admin-notification"
                value={notification}
                onChange={(e) => setNotification(e.target.value)}
                className="h-28 w-full resize-y rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] p-3.5 text-sm text-[var(--panel-ink)] outline-none transition-colors placeholder:text-[var(--panel-faint)] focus:border-[var(--panel-accent)]"
                placeholder="A message to show on every dashboard…"
              />
            </div>

            <button
              type="button"
              onClick={handleBroadcast}
              disabled={saving}
              className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary-light px-4 text-[13px] font-semibold text-[#171A12] transition-colors hover:bg-[#BACF7F] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Update broadcast"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
