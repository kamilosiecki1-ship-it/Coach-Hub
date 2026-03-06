"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold mb-2">Coś poszło nie tak</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Błąd został automatycznie zgłoszony. Możesz spróbować ponownie.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            Spróbuj ponownie
          </button>
        </div>
      </body>
    </html>
  );
}
