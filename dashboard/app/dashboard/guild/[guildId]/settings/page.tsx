import React from "react";
import { Settings2 } from "lucide-react";
import { api } from "@/lib/api";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function GuildSettingsPage({ params }: { params: { guildId: string } }) {
  const config = await api.getPrefix(params.guildId);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[var(--panel-ink)]">
          <Settings2 className="h-6 w-6 text-primary" />
          General Settings
        </h2>
        <p className="mt-1 text-sm text-[var(--panel-muted)]">Manage core bot configuration for this server.</p>
      </div>

      <SettingsForm initialPrefix={config.prefix} guildId={params.guildId} />
    </div>
  );
}
