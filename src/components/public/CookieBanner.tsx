"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg dark:bg-slate-900 dark:border-slate-700">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Używamy plików cookie w celu poprawnego działania serwisu. Szczegóły w{" "}
          <Link href="/polityka-prywatnosci" className="underline hover:text-slate-900">Polityce Prywatności</Link>.
        </p>
        <button
          onClick={accept}
          className="shrink-0 bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Akceptuj
        </button>
      </div>
    </div>
  );
}
