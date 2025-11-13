"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const navItems = [
  {
    name: "Profile",
    href: "/dashboard/profile",
  },
  {
    name: "Products",
    href: "/dashboard/products",
  },
  {
    name: "Orders",
    href: "/dashboard/orders",
  },
];

interface SidebarProps {
  user: User;
}

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email;

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-6">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <Avatar name={displayName} />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900 text-slate-50 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4">
        <SignOutButton />
      </div>
    </aside>
  );
}

