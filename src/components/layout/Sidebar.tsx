"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Brain, LayoutDashboard, Users, Settings, LogOut, BookOpen, Sun, Moon, Shield,
  Mail, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/pulpit", label: "Pulpit", icon: LayoutDashboard },
  { href: "/klienci", label: "Klienci", icon: Users },
  { href: "/hub-wiedzy", label: "Hub wiedzy", icon: BookOpen },
  { href: "/ustawienia", label: "Ustawienia", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen border-r bg-white dark:bg-card sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-xl shrink-0">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-none text-foreground">Coach Hub</p>
          <p className="text-xs text-slate-400 mt-0.5">AI Superwizor</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Admin section — visible only to admins */}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Administracja
              </p>
            </div>
            {[
              { href: "/admin/uzytkownicy", label: "Użytkownicy", icon: Shield },
              { href: "/admin/zaproszenia", label: "Zaproszenia", icon: Mail },
              { href: "/admin/uzycie-ai", label: "Użycie AI", icon: Zap },
            ].map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    active
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User + theme toggle */}
      <div className="border-t border-border px-3 py-3 space-y-1">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-semibold shrink-0">
            {session?.user?.name?.charAt(0).toUpperCase() ?? session?.user?.email?.charAt(0).toUpperCase() ?? "C"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate leading-none">{session?.user?.name ?? "Coach"}</p>
              {isAdmin && (
                <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 px-1.5 py-0.5 rounded-full shrink-0">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{session?.user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 text-xs h-8"
            onClick={() => signOut({ callbackUrl: "/logowanie" })}
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Wyloguj się
          </Button>

          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title={isDark ? "Tryb jasny" : "Tryb ciemny"}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
