import type { Metadata } from "next";
import LegalPageContent from "@/components/public/LegalPageContent";

export const metadata: Metadata = {
  title: "Regulamin — SessionLab",
  robots: { index: true, follow: true },
};

export default function RegulaminPage() {
  return <LegalPageContent filename="05-regulamin-tos.md" />;
}
