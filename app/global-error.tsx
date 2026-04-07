"use client";

/**
 * Root-level error UI (replaces the root layout when it fires — needs own html/body).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 p-8 text-zinc-100 antialiased">
        <div className="mx-auto max-w-md space-y-4 rounded-lg border border-red-900/60 bg-red-950/30 p-6">
          <h1 className="text-lg font-semibold text-red-200">
            Something went wrong
          </h1>
          <p className="text-sm text-red-200/80">
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
