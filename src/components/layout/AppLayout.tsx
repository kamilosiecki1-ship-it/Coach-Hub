"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { useSidebar } from "@/contexts/sidebar-context";

// Routes that should auto-collapse the sidebar (content-heavy pages)
function shouldAutoCollapse(pathname: string): boolean {
  return (
    pathname.startsWith("/mentor") ||
    /^\/klienci\/.+/.test(pathname)
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { collapsed, setCollapsed, toggle } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    if (shouldAutoCollapse(pathname)) {
      setCollapsed(true);
    }
  }, [pathname, setCollapsed]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggle}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
