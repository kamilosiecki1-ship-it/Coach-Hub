"use client";
import { Sidebar } from "./Sidebar";
import { useSidebar } from "@/contexts/sidebar-context";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle } = useSidebar();

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
