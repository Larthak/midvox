import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isDashboardAdmin } from "@/lib/admin";
import DashboardShell from "@/components/dashboard/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const dashboardAdmin = isDashboardAdmin(session?.user?.id);

  return (
    <DashboardShell dashboardAdmin={dashboardAdmin}>{children}</DashboardShell>
  );
}
