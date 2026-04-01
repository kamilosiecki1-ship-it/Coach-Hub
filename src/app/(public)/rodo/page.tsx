import type { Metadata } from "next";
import LegalPageContent from "@/components/public/LegalPageContent";

export const metadata: Metadata = {
  title: "RODO — SessionLab",
  robots: { index: true, follow: true },
};

export default function RodoPage() {
  return <LegalPageContent filename="08-klauzula-informacyjna.md" />;
}
