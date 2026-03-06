"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Invisible client component that triggers a server-component refresh every
 * time the Pulpit page mounts (i.e. every navigation back to /pulpit).
 * This keeps sessions, notes, and Mentor AI conversations up-to-date without
 * requiring a manual browser reload.
 */
export function DashboardRefresher() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}
