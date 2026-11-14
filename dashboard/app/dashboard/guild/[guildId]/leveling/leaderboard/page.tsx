"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  User,
  Zap,
  RefreshCcw,
  TrendingUp,
  Medal,
  Crown,
  Search
} from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LeaderboardEntry } from "@/types/api";

export default function LeaderboardPage({ params }: { params: { guildId: string } }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const data = await api.getLeaderboard(params.guildId);
        setLeaderboard(data);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [params.guildId]);

  const filteredData = leaderboard.filter(entry =>
    entry.name.toLowerCase().includes(search.toLowerCase()) ||
    entry.user_id.toString().includes(search)
  );

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <RefreshCcw className="h-5 w-5 animate-spin text-[var(--panel-accent-deep)]" />
        <p className="text-sm text-[var(--panel-muted)]">Loading leaderboard…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-20">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-[var(--panel-ink)]">
            <Trophy className="h-6 w-6 text-amber-500" />
            Leaderboard
          </h2>
          <p className="mt-1 text-sm text-[var(--panel-muted)]">
            Top members by experience and activity.
          </p>
        </div>

        <div className="group relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-faint)] transition-colors group-focus-within:text-[var(--panel-accent-deep)]" />
          <Input
            placeholder="Search members"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10"
            aria-label="Search members"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-3">
        {leaderboard.slice(0, 3).map((user, i) => (
          <div
            key={user.user_id}
            className={cn(
              "relative flex flex-col items-center overflow-hidden rounded-2xl border p-6 text-center transition-all",
              i === 0
                ? "border-amber-500/30 bg-amber-500/[0.07] md:-translate-y-2 md:order-2"
                : i === 1
                  ? "border-[var(--panel-line)] bg-[var(--panel-raised)] md:order-1"
                  : "border-[var(--panel-line)] bg-[var(--panel-raised)] md:order-3",
            )}
          >
            <div className="absolute right-0 top-0 p-4">
              {i === 0 ? (
                <Crown className="h-6 w-6 text-amber-500" />
              ) : i === 1 ? (
                <Medal className="h-6 w-6 text-[var(--panel-faint)]" />
              ) : (
                <Medal className="h-6 w-6 text-amber-700" />
              )}
            </div>

            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--panel-line)] bg-[var(--panel-paper)]">
              <User className="h-7 w-7 text-[var(--panel-muted)]" />
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--panel-paper)] text-[11px] font-semibold",
                  i === 0
                    ? "bg-amber-500 text-black"
                    : i === 1
                      ? "bg-[var(--border-mid)] text-[var(--panel-ink)]"
                      : "bg-amber-700 text-white",
                )}
              >
                #{i + 1}
              </div>
            </div>

            <h3 className="max-w-full truncate text-base font-semibold text-[var(--panel-ink)]">
              {user.name}
            </h3>
            <p className="mt-1 text-xs font-medium text-[var(--panel-muted)]">
              Level {user.level}
            </p>

            <div className="mt-5 flex items-center gap-1.5 rounded-lg border border-[var(--panel-line)] bg-[var(--panel-paper)] px-3 py-1.5">
              <Zap className="h-3 w-3 text-[var(--panel-accent-deep)]" />
              <span className="text-xs font-semibold tabular-nums text-[var(--panel-ink)]">
                {user.xp.toLocaleString()} XP
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-surface overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--panel-line)] bg-[var(--panel-raised)]">
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--panel-muted)]">Rank</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--panel-muted)]">Member</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--panel-muted)]">Level</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--panel-muted)]">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--panel-line)]">
              {filteredData.slice(3).map((entry, i) => (
                <tr key={entry.user_id} className="group transition-colors hover:bg-[var(--panel-raised)]">
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-[var(--panel-muted)]">
                      #{i + 4}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--panel-line)] bg-[var(--panel-raised)]">
                        <User className="h-4 w-4 text-[var(--panel-muted)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[var(--panel-ink)]">{entry.name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--panel-faint)]">{entry.user_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-[var(--panel-accent-deep)]">
                      Level {entry.level}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span className="text-[13px] font-semibold tabular-nums text-[var(--panel-ink)]">{entry.xp.toLocaleString()}</span>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredData.length === 3 && (
                <tr>
                  <td colSpan={4} className="px-5 py-14 text-center">
                    <p className="text-sm text-[var(--panel-muted)]">No other members ranked yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--panel-line)] bg-[var(--panel-raised)] px-5 py-3">
          <p className="text-xs text-[var(--panel-muted)]">
            Showing <span className="font-semibold text-[var(--panel-ink)]">{filteredData.length}</span> ranked members
          </p>
        </div>
      </div>
    </div>
  );
}
