import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/navigation/sidebar";
import { getCurrentServerUser } from "@/lib/auth/server";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getCurrentServerUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-white">
      <DashboardSidebar user={user} />
      <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
    </div>
  );
}

