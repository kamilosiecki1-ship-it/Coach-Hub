// Server component
import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-700">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-slate-900 dark:text-white">
          SessionLab
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/logowanie" className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300">
            Zaloguj się
          </Link>
          <Link href="/rejestracja" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            Zarejestruj się
          </Link>
        </nav>
      </div>
    </header>
  );
}
