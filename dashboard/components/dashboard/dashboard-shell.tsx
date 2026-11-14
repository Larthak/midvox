"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart4,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Ticket,
  User,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { cn, isAdmin } from "@/lib/utils";
import { api } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

type NavGroup = {
  name: string;
  items: NavItem[];
};

type SidebarEntry = NavItem | NavGroup;

type OpenMenu = "notifications" | "profile" | null;

function isNavGroup(entry: SidebarEntry): entry is NavGroup {
  return "items" in entry;
}

export default function DashboardShell({
  children,
  dashboardAdmin = false,
}: {
  children: React.ReactNode;
  dashboardAdmin?: boolean;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [globalNotification, setGlobalNotification] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const authRedirectStarted = useRef(false);

  useEffect(() => {
    const isDark = window.localStorage.getItem("midvox-theme") === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("theme-dark", isDark);
  }, []);

  const toggleTheme = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    window.localStorage.setItem("midvox-theme", nextMode ? "dark" : "light");
    document.documentElement.classList.toggle("theme-dark", nextMode);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (bellRef.current?.contains(target)) return;
      if (profileRef.current?.contains(target)) return;
      setOpenMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenMenu(null);
      setIsSidebarOpen(false);
    };

    // A dropdown elsewhere on the page (for example a guild setting) should
    // close the header menus, and vice versa.
    const handleOtherPopover = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== "dashboard-menu") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("midvox:popover-open", handleOtherPopover);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("midvox:popover-open", handleOtherPopover);
    };
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      sidebarRef.current
        ?.querySelector<HTMLElement>("[data-sidebar-close]")
        ?.focus();
    }, 60);

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !sidebarRef.current) return;

      const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trapFocus);
      previousFocus?.focus?.();
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (status !== "unauthenticated" || authRedirectStarted.current) return;

    authRedirectStarted.current = true;
    void signIn("discord", { callbackUrl: pathname });
  }, [pathname, status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchNotification = async () => {
      try {
        const config = await api.getAdminNotification();
        setGlobalNotification(config.global_notification);
      } catch {
        // A missing broadcast should not interrupt the dashboard.
      }
    };
    void fetchNotification();
  }, [status]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="panel-shell flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <span className="panel-brand-mark h-11 w-11 text-xl">m</span>
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--panel-ink)]">
            Loading your dashboard
          </p>
          <p className="mt-1 text-xs text-[var(--panel-muted)]">
            {status === "unauthenticated"
              ? "Redirecting you to Discord sign in…"
              : "Checking your Discord permissions…"}
          </p>
        </div>
      </div>
    );
  }

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    setOpenMenu((current) => (current === menu ? null : menu));
    window.dispatchEvent(
      new CustomEvent("midvox:popover-open", { detail: "dashboard-menu" }),
    );
  };

  const match = pathname.match(/\/dashboard\/guild\/([^/]+)/);
  const currentGuildId = match ? match[1] : null;
  const guildRoot = currentGuildId ? `/dashboard/guild/${currentGuildId}` : null;

  const sidebarItems: SidebarEntry[] = currentGuildId
    ? [
        { name: "Overview", href: guildRoot!, icon: LayoutDashboard },
        {
          name: "Security",
          items: [
            { name: "Anti-Nuke", href: `/dashboard/guild/${currentGuildId}/antinuke`, icon: ShieldCheck },
            { name: "Automod", href: `/dashboard/guild/${currentGuildId}/automod`, icon: ShieldCheck },
            { name: "Message Deleter", href: `/dashboard/guild/${currentGuildId}/antispamplus`, icon: MessageSquare },
            { name: "Verification", href: `/dashboard/guild/${currentGuildId}/verification`, icon: User },
          ],
        },
        {
          name: "Engagement",
          items: [
            { name: "Welcome", href: `/dashboard/guild/${currentGuildId}/welcome`, icon: Bell },
            { name: "Leveling", href: `/dashboard/guild/${currentGuildId}/leveling`, icon: BarChart4 },
            { name: "Vanity Roles", href: `/dashboard/guild/${currentGuildId}/vanityroles`, icon: Sparkles },
            { name: "Auto Role", href: `/dashboard/guild/${currentGuildId}/autorole`, icon: User },
            { name: "Auto React", href: `/dashboard/guild/${currentGuildId}/autoreact`, icon: Zap },
            { name: "Reaction Roles", href: `/dashboard/guild/${currentGuildId}/reactionroles`, icon: Zap },
            { name: "Join DM", href: `/dashboard/guild/${currentGuildId}/joindm`, icon: User },
            { name: "Invites", href: `/dashboard/guild/${currentGuildId}/invites`, icon: Server },
            { name: "Tracking", href: `/dashboard/guild/${currentGuildId}/tracking`, icon: BarChart4 },
          ],
        },
        {
          name: "Media",
          items: [
            { name: "Instagram Downloader", href: `/dashboard/guild/${currentGuildId}/instadl`, icon: Download },
          ],
        },
        {
          name: "Utility",
          items: [
            { name: "Tickets", href: `/dashboard/guild/${currentGuildId}/tickets`, icon: Ticket },
            { name: "Join to Create", href: `/dashboard/guild/${currentGuildId}/j2c`, icon: Settings },
            { name: "Custom Roles", href: `/dashboard/guild/${currentGuildId}/customroles`, icon: ShieldCheck },
            { name: "Role Creator", href: `/dashboard/guild/${currentGuildId}/roles`, icon: Layers3 },
            { name: "Voice Role", href: `/dashboard/guild/${currentGuildId}/invcrole`, icon: Settings },
          ],
        },
        { name: "Server settings", href: `/dashboard/guild/${currentGuildId}/settings`, icon: Settings },
        { name: "All servers", href: "/dashboard/guilds", icon: Server },
      ]
    : [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Servers", href: "/dashboard/guilds", icon: Server },
        ...(dashboardAdmin || isAdmin(session?.user?.id)
          ? [{ name: "Admin panel", href: "/dashboard/admin", icon: Shield }]
          : []),
      ];

  const mainItems = currentGuildId
    ? sidebarItems.filter((item) => !("href" in item) || item.href !== "/dashboard/guilds")
    : sidebarItems;
  const backItem = currentGuildId
    ? (sidebarItems.find(
        (item) => "href" in item && item.href === "/dashboard/guilds",
      ) as NavItem | undefined)
    : undefined;
  const BackIcon = backItem?.icon || Server;

  const sectionLabel = currentGuildId
    ? "Server"
    : pathname === "/dashboard/guilds"
      ? "Servers"
      : pathname.startsWith("/dashboard/admin")
        ? "Admin"
        : "Overview";

  const firstName = session?.user?.name?.split(" ")[0] || "Account";

  const navLink = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" &&
        item.href !== guildRoot &&
        pathname.startsWith(`${item.href}/`));

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "panel-nav-link group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
          isActive && "is-active",
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.name}</span>
        {isActive && (
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--panel-accent-deep)]" />
        )}
      </Link>
    );
  };

  return (
    <div className="panel-shell min-h-screen">
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[var(--panel-ink)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--panel-page)]"
      >
        Skip to content
      </a>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        id="dashboard-sidebar"
        ref={sidebarRef}
        aria-label="Dashboard navigation"
        className={cn(
          "panel-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-[transform,visibility] duration-200 lg:visible lg:translate-x-0",
          isSidebarOpen ? "visible translate-x-0" : "invisible -translate-x-full",
        )}
      >
        <div className="panel-sidebar-header flex h-16 shrink-0 items-center px-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5"
            aria-label={`${BRAND_NAME} homepage`}
          >
            <span className="panel-brand-mark">m</span>
            <span className="min-w-0">
              <span className="panel-brand-name block truncate text-sm font-bold leading-none">
                {BRAND_NAME}
              </span>
              <span className="mt-1 block text-[11px] font-medium text-[var(--panel-muted)]">
                Control panel
              </span>
            </span>
          </Link>
          <button
            type="button"
            data-sidebar-close
            className="panel-icon-button ml-auto lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {mainItems.map((entry) =>
            isNavGroup(entry) ? (
              <div key={entry.name}>
                <p className="panel-nav-label mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em]">
                  {entry.name}
                </p>
                <div className="space-y-0.5">
                  {entry.items.map((item) => navLink(item))}
                </div>
              </div>
            ) : (
              navLink(entry)
            ),
          )}

          {backItem && (
            <div className="border-t border-[var(--panel-line)] pt-4">
              <Link
                href={backItem.href}
                className="panel-nav-link group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
              >
                <BackIcon className="h-4 w-4 shrink-0" />
                {backItem.name}
              </Link>
            </div>
          )}
        </nav>

        <div className="shrink-0 border-t border-[var(--panel-line)] p-3">
          <div className="panel-user-card flex items-center gap-2.5 rounded-xl px-3 py-2.5">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[var(--panel-line)]">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--panel-raised)]">
                  <User className="h-4 w-4 text-[var(--panel-muted)]" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-[var(--panel-ink)]">
                {session?.user?.name || "Account"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] leading-none text-[var(--panel-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Signed in
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="ml-auto rounded-lg p-1.5 text-[var(--panel-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="panel-topbar sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            ref={menuButtonRef}
            type="button"
            className="panel-icon-button lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isSidebarOpen}
            aria-controls="dashboard-sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 lg:hidden"
            aria-label={`${BRAND_NAME} dashboard`}
          >
            <span className="panel-brand-mark h-7 w-7 text-base">m</span>
            <span className="text-sm font-bold text-[var(--panel-ink)]">{BRAND_NAME}</span>
          </Link>

          <div className="hidden items-center gap-1.5 text-xs text-[var(--panel-muted)] lg:flex">
            <span>{BRAND_NAME}</span>
            <ChevronRight className="h-3 w-3 text-[var(--panel-faint)]" />
            <span className="font-medium text-[var(--panel-ink)]">{sectionLabel}</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/docs"
              className="panel-icon-button hidden sm:inline-grid"
              aria-label="Documentation"
              title="Documentation"
            >
              <BookOpen className="h-[18px] w-[18px]" />
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              className="panel-icon-button"
              aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
              title={darkMode ? "Switch to light theme" : "Switch to dark theme"}
            >
              {darkMode ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            <div className="relative" ref={bellRef}>
              <button
                type="button"
                onClick={() => toggleMenu("notifications")}
                className="panel-icon-button relative"
                aria-label="Notifications"
                aria-haspopup="dialog"
                aria-expanded={openMenu === "notifications"}
                aria-controls="dashboard-notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                {globalNotification && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--panel-accent-deep)]" />
                )}
              </button>

              <AnimatePresence>
                {openMenu === "notifications" && (
                  <motion.div
                    id="dashboard-notifications"
                    role="dialog"
                    aria-label="Notifications"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.12 }}
                    className="panel-popover absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-2"
                  >
                    <div className="flex items-center justify-between px-2 pb-2 pt-1">
                      <p className="text-[13px] font-semibold text-[var(--panel-ink)]">
                        Notifications
                      </p>
                      {globalNotification && (
                        <button
                          type="button"
                          onClick={() => setGlobalNotification(null)}
                          className="rounded-md px-1.5 py-1 text-xs font-medium text-[var(--panel-muted)] transition-colors hover:bg-[var(--panel-raised)] hover:text-[var(--panel-ink)]"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>

                    {globalNotification ? (
                      <div className="rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] p-3.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-[var(--panel-accent-deep)]" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--panel-accent-deep)]">
                            Announcement
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-line break-words text-[13px] leading-5 text-[var(--panel-muted)]">
                          {globalNotification}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 px-4 py-7 text-center">
                        <Bell className="h-5 w-5 text-[var(--panel-faint)]" />
                        <p className="text-[13px] font-medium text-[var(--panel-ink)]">
                          You’re all caught up
                        </p>
                        <p className="text-xs text-[var(--panel-muted)]">
                          Announcements from the team will appear here.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <span className="mx-1 hidden h-5 w-px bg-[var(--panel-line)] sm:block" />

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => toggleMenu("profile")}
                className="panel-profile-button flex items-center gap-2 rounded-full p-1 transition-colors sm:pr-2"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={openMenu === "profile"}
                aria-controls="dashboard-account-menu"
              >
                <span className="relative h-7 w-7 overflow-hidden rounded-lg border border-[var(--panel-line)]">
                  {session?.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="28px"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-[var(--panel-raised)]">
                      <User className="h-3.5 w-3.5 text-[var(--panel-muted)]" />
                    </span>
                  )}
                </span>
                <span className="hidden max-w-28 truncate text-[13px] font-medium text-[var(--panel-ink)] sm:block">
                  {firstName}
                </span>
                <ChevronDown
                  className={cn(
                    "hidden h-3.5 w-3.5 text-[var(--panel-muted)] transition-transform sm:block",
                    openMenu === "profile" && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence>
                {openMenu === "profile" && (
                  <motion.div
                    id="dashboard-account-menu"
                    role="menu"
                    aria-label="Account"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.12 }}
                    className="panel-popover absolute right-0 z-20 mt-2 w-60 rounded-2xl p-1.5"
                  >
                    <div className="px-3 pb-2.5 pt-2">
                      <p className="text-[11px] font-medium text-[var(--panel-muted)]">
                        Signed in as
                      </p>
                      <p className="mt-0.5 truncate text-[13px] font-semibold text-[var(--panel-ink)]">
                        {session?.user?.name || "Account"}
                      </p>
                    </div>

                    <div className="my-1 border-t border-[var(--panel-line)]" />

                    <Link
                      href="/dashboard/guilds"
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--panel-muted)] transition-colors hover:bg-[var(--panel-raised)] hover:text-[var(--panel-ink)]"
                    >
                      <Server className="h-4 w-4" />
                      Your servers
                    </Link>
                    <Link
                      href="/docs"
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--panel-muted)] transition-colors hover:bg-[var(--panel-raised)] hover:text-[var(--panel-ink)]"
                    >
                      <BookOpen className="h-4 w-4" />
                      Documentation
                    </Link>

                    <div className="my-1 border-t border-[var(--panel-line)]" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void signOut({ callbackUrl: "/" })}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main
          id="dashboard-content"
          className="panel-main flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
        >
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mx-auto w-full max-w-[1400px]"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
