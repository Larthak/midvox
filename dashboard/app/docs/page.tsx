import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Download,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Documentation — ${BRAND_NAME}`,
  description: `How ${BRAND_NAME} modules and dashboard access work.`,
};

type Module = {
  name: string;
  description: string;
};

type Section = {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  modules: Module[];
};

const SECTIONS: Section[] = [
  {
    id: "access",
    title: "Access and permissions",
    summary:
      "What you need before you can open a server, and which actions the dashboard allows.",
    icon: KeyRound,
    modules: [
      {
        name: "Signing in",
        description:
          "Use the Log in button and approve Discord access. The dashboard only opens for allowlisted administrators or people who can manage at least one server.",
      },
      {
        name: "Server permissions",
        description:
          "Manage Server or Administrator opens a server. Changing roles also requires Manage Roles. Every server page checks your Discord permissions on the server, not just in the browser.",
      },
      {
        name: "Safety limits",
        description:
          "Role changes are validated on the server. The dashboard deliberately does not expose Kick Members or Ban Members. Administrator is only available through the explicit Advanced permission group in Role Creator.",
      },
      {
        name: "Owner-only screens",
        description:
          "The admin panel and the bot's own Discord, YouTube, and Instagram login screens are limited to the bot owner. Other accounts are redirected.",
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    summary:
      "Keep raids, spam, and destructive changes under control before they spread.",
    icon: ShieldCheck,
    modules: [
      {
        name: "Anti-Nuke",
        description:
          "Watches for mass channel, role, and member changes and applies the limits you configure. Use it together with a trusted staff team and a protected owner role.",
      },
      {
        name: "Automod",
        description:
          "Filters unwanted messages using your keyword, link, and invite rules, with actions such as delete, warn, or timeout. Start with logging only until you know what normal traffic looks like.",
      },
      {
        name: "Message Deleter",
        description:
          "Cleans up spam and raid traffic with duplicate-message limits, heat thresholds, and optional join gates for very new or avatar-less accounts.",
      },
      {
        name: "Verification",
        description:
          "Sends new members through a verification step before they receive access. Choose the verification channel and the role that is granted on success.",
      },
    ],
  },
  {
    id: "engagement",
    title: "Engagement",
    summary:
      "Welcome new members and give people reasons to keep participating.",
    icon: Sparkles,
    modules: [
      {
        name: "Welcome",
        description:
          "Posts a plain or embed welcome message in the channel you choose. Supports placeholders such as the member and server name.",
      },
      {
        name: "Leveling",
        description:
          "Awards XP for activity and tracks a server leaderboard. Review the leaderboard from the Leveling page to spot inactive or unusually fast growth.",
      },
      {
        name: "Vanity Roles",
        description:
          "Rewards members who put your server's vanity text in their status. Each setup pairs a vanity string with a role and a log channel.",
      },
      {
        name: "Auto Role",
        description:
          "Gives new members a starting role as soon as they join, so they can see the right channels without waiting for staff.",
      },
      {
        name: "Auto React",
        description:
          "Adds your chosen reactions to messages in selected channels. Useful for lightweight prompts and community rituals.",
      },
      {
        name: "Reaction Roles",
        description:
          "Lets members assign roles to themselves through reactions or buttons. Use it for notification ping roles and optional interest groups.",
      },
      {
        name: "Join DM",
        description:
          "Sends a private welcome message when someone joins. Keep it short, useful, and easy to act on.",
      },
      {
        name: "Invites and tracking",
        description:
          "Records which invite brought a member in and can log join events to a channel. Useful for creator and partner programmes.",
      },
    ],
  },
  {
    id: "support",
    title: "Support",
    summary: "Give questions a clear place to land and a clean way to close.",
    icon: Ticket,
    modules: [
      {
        name: "Tickets",
        description:
          "Publishes a ticket panel with buttons or a dropdown, routes tickets into categories, and can record transcripts. Set global staff roles, then override them per category when needed.",
      },
      {
        name: "Panel appearance",
        description:
          "Edit the title, description, colour, and images on the ticket panel from the Tickets page. Changes apply to the next panel update.",
      },
    ],
  },
  {
    id: "utility",
    title: "Utility",
    summary: "Smaller tools that remove repetitive admin work.",
    icon: Wrench,
    modules: [
      {
        name: "Join to Create",
        description:
          "Members join a voice channel and the bot creates a temporary channel for them. Choose the join channel and an optional control channel.",
      },
      {
        name: "Custom Roles",
        description:
          "Connects named roles used by the bot's features, such as staff, VIP, and guest roles, to real roles in your server.",
      },
      {
        name: "Role Creator",
        description:
          "Creates and edits roles with permission presets. Kick Members and Ban Members are deliberately unavailable from the dashboard.",
      },
      {
        name: "Voice Role",
        description:
          "Assigns a role while a member is in a voice channel and removes it when they leave. Useful for voice-only access or activity tracking.",
      },
    ],
  },
  {
    id: "media",
    title: "Media",
    summary: "Turn links into files without asking members to use another tool.",
    icon: Download,
    modules: [
      {
        name: "Instagram Downloader",
        description:
          "Watches selected channels for Instagram Reels, posts, stories, and YouTube Shorts links, then posts the downloaded media back to the channel.",
      },
    ],
  },
  {
    id: "bot-owner",
    title: "Bot owner",
    summary:
      "Screens that control the bot's own accounts. These are not server settings.",
    icon: Bot,
    modules: [
      {
        name: "Discord login",
        description:
          "Signs the bot's own Discord account in for features that need a user session, such as bumping. The saved session is encrypted.",
      },
      {
        name: "YouTube and Instagram login",
        description:
          "Connects the bot's media accounts for Shorts and Reels downloads. Only the bot owner can open these screens.",
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="panel-shell min-h-screen">
      <header className="panel-topbar sticky top-0 z-30">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label={`${BRAND_NAME} homepage`}
          >
            <span className="panel-brand-mark">m</span>
            <span className="panel-brand-name text-sm font-bold">
              {BRAND_NAME}
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-xs font-semibold text-[var(--panel-muted)] transition-colors hover:text-[var(--panel-ink)] sm:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--panel-line)] bg-[var(--panel-paper)] px-4 text-xs font-semibold text-[var(--panel-ink)] transition-colors hover:border-[var(--panel-accent)]"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-[var(--panel-accent-deep)]">
            Documentation
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--panel-ink)] sm:text-4xl">
            A short guide to every part of {BRAND_NAME}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--panel-muted)]">
            Each server keeps its own configuration. Open a server from the
            dashboard, pick a module in the sidebar, and save your changes
            there. Nothing on this page changes a live setting.
          </p>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-8 lg:grid-cols-[210px_1fr]">
          <nav aria-label="Documentation sections" className="lg:sticky lg:top-24 lg:self-start">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--panel-faint)]">
              On this page
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 lg:flex-col">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[var(--panel-muted)] transition-colors hover:bg-[var(--panel-raised)] hover:text-[var(--panel-ink)]"
                >
                  <section.icon className="h-3.5 w-3.5 shrink-0 text-[var(--panel-faint)]" />
                  {section.title}
                </a>
              ))}
            </div>
          </nav>

          <div className="space-y-5">
            {SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="panel-surface scroll-mt-24 rounded-2xl p-5 sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-accent-deep)]">
                    <section.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--panel-ink)]">
                      {section.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[var(--panel-muted)]">
                      {section.summary}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 divide-y divide-[var(--panel-line)] border-t border-[var(--panel-line)]">
                  {section.modules.map((module) => (
                    <div
                      key={module.name}
                      className="grid gap-1 py-3.5 sm:grid-cols-[170px_1fr] sm:gap-4"
                    >
                      <dt className="text-[13px] font-semibold text-[var(--panel-ink)]">
                        {module.name}
                      </dt>
                      <dd className="text-sm leading-6 text-[var(--panel-muted)]">
                        {module.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            <section className="rounded-2xl border border-dashed border-[var(--panel-line)] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-accent-deep)]">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--panel-ink)]">
                    Still stuck?
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--panel-muted)]">
                    Ask in the Discord server where you use {BRAND_NAME}. Include
                    the server name, the module, and what you expected to happen.
                    Never post your Discord token, session cookies, or API keys.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/dashboard/guilds"
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--panel-line)] bg-[var(--panel-paper)] px-4 text-xs font-semibold text-[var(--panel-ink)] transition-colors hover:border-[var(--panel-accent)]"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Open your servers
                    </Link>
                    <a
                      href="/api/invite"
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary-light px-4 text-xs font-semibold text-[#171A12] transition-colors hover:bg-[#BACF7F]"
                    >
                      Add {BRAND_NAME}
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
