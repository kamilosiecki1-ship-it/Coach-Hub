// Server component — czyta plik MD z dysku i renderuje przez react-markdown
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import fs from "fs";
import path from "path";

interface LegalPageContentProps {
  filename: string; // np. "05-regulamin-tos.md"
}

export default function LegalPageContent({ filename }: LegalPageContentProps) {
  const filePath = path.join(process.cwd(), "docs", "legal", filename);
  const content = fs.readFileSync(filePath, "utf-8");
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-slate dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
