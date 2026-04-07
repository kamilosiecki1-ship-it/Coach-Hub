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

  const respond = (value: "accepted" | "rejected") => {
    localStorage.setItem("cookie-consent", value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg dark:bg-slate-900 dark:border-slate-700">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Używamy plików cookie niezbędnych do działania serwisu oraz opcjonalnych cookies analitycznych. Szczegóły w{" "}
          <Link href="/polityka-prywatnosci" className="underline hover:text-slate-900 dark:hover:text-slate-100">Polityce Prywatności</Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => respond("rejected")}
            className="px-5 py-2 rounded-md text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            Tylko niezbędne
          </button>
          <button
            onClick={() => respond("accepted")}
            className="px-5 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Akceptuj wszystkie
          </button>
        </div>
      </div>
    </div>
  );
}
