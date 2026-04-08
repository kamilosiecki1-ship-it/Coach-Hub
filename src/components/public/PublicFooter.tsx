// Server component
import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-700 py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} SessionLab. Wszelkie prawa zastrzeżone.</p>
        <nav className="flex gap-4 text-sm text-slate-500">
          <Link href="/regulamin" className="hover:text-slate-900 dark:hover:text-white">Regulamin</Link>
          <Link href="/polityka-prywatnosci" className="hover:text-slate-900 dark:hover:text-white">Polityka Prywatności</Link>
          <Link href="/rodo" className="hover:text-slate-900 dark:hover:text-white">RODO</Link>
        </nav>
      </div>
    </footer>
  );
}
