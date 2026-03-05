import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/contexts/sidebar-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coach Hub – AI Superwizor Coachingu",
  description: "Narzędzie AI dla coachów – notatki, refleksja, superwizja.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <SidebarProvider>
              {children}
              <Toaster />
            </SidebarProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
