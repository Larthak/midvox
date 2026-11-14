import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServerCardProps {
  id: string | number;
  name: string;
  iconUrl?: string | null;
  memberCount: number;
  isActive?: boolean;
  className?: string;
}

export const ServerCard = ({
  id,
  name,
  iconUrl,
  memberCount,
  isActive = true,
  className,
}: ServerCardProps) => {
  const initial = name.charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "group panel-surface flex flex-col overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--panel-accent)] hover:shadow-[0_16px_32px_rgba(25,27,20,0.08)]",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="relative h-14 w-14 shrink-0">
            {iconUrl ? (
              <Image
                src={iconUrl}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 rounded-2xl border border-[var(--panel-line)] object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-raised)] text-lg font-bold text-[var(--panel-accent-deep)]">
                {initial}
              </div>
            )}
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--panel-paper)] bg-emerald-500" />
            )}
          </div>

          {isActive && (
            <span className="panel-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Connected
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-[var(--panel-ink)]">
            {name}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--panel-muted)]">
            <Users className="h-3.5 w-3.5 text-[var(--panel-faint)]" />
            {memberCount.toLocaleString()} members
          </p>
        </div>
      </div>

      <Link
        href={`/dashboard/guild/${id}`}
        className="flex items-center justify-between border-t border-[var(--panel-line)] bg-[var(--panel-raised)] px-5 py-3 text-[13px] font-semibold text-[var(--panel-muted)] transition-colors group-hover:text-[var(--panel-ink)]"
      >
        Manage server
        <ArrowUpRight className="h-4 w-4 text-[var(--panel-faint)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--panel-accent-deep)]" />
      </Link>
    </div>
  );
};
