import type { Metadata } from "next";
import LegalPageContent from "@/components/public/LegalPageContent";

export const metadata: Metadata = {
  title: "Polityka Prywatności — SessionLab",
  robots: { index: true, follow: true },
};

export default function PolitykaPrywatnosciPage() {
  return <LegalPageContent filename="06-polityka-prywatnosci.md" />;
}
