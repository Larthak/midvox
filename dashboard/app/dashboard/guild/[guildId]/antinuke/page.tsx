import React from "react";
import { ShieldAlert } from "lucide-react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";

const AntiNukeForm = dynamic(() => import("@/components/dashboard/antinuke-form").then(mod => mod.AntiNukeForm), {
  loading: () => <div className="h-96 w-full animate-pulse bg-[#1A1A1A]/30 rounded-[6px]" />
});

export default async function AntiNukePage({ params }: { params: { guildId: string } }) {
  const config = await api.getAntiNuke(params.guildId);

  if (!config) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Anti-Nuke Protection
          </h2>
          <p className="text-neutral-400 mt-1">Detect destructive actions such as mass-deletion, rogue bans, and permission abuse, with automatic recovery and no member removal.</p>
        </div>
      </div>

      <AntiNukeForm initialConfig={config} guildId={params.guildId} />
    </div>
  );
}
