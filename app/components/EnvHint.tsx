"use client";

import { useEffect, useState } from "react";

/**
 * Shown when NEXT_PUBLIC_SUPABASE_* were missing at build time (e.g. Vercel without env, or local without .env.local).
 */
export function EnvHint() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
  const [isVercel, setIsVercel] = useState(false);

  useEffect(() => {
    const h = window.location.hostname;
    setIsVercel(h === "vercel.app" || h.endsWith(".vercel.app"));
  }, []);

  if (configured) return null;

  if (isVercel) {
    return (
      <aside
        className="rounded-lg border border-amber-800/80 bg-amber-950/40 px-4 py-4 text-sm text-amber-100"
        role="status"
      >
        <p className="mb-2 font-medium text-amber-50">
          Supabase isn’t configured for this deployment
        </p>
        <p className="mb-3 text-amber-100/95">
          <code className="text-amber-200">.env.local</code> only exists on your
          computer — it is <strong className="text-amber-50">not</strong> sent
          to Vercel. Add the same keys in the Vercel project, then redeploy.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-amber-100/95">
          <li>
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline hover:text-emerald-300"
            >
              Vercel Dashboard
            </a>{" "}
            → your <strong className="text-amber-50">gridiron</strong> project →{" "}
            <strong className="text-amber-50">Settings</strong> →{" "}
            <strong className="text-amber-50">Environment Variables</strong>.
          </li>
          <li>
            Add{" "}
            <code className="text-amber-200">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-amber-200">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            (values from Supabase → Project Settings → API — same as your local{" "}
            <code className="text-amber-200">.env.local</code>).
          </li>
          <li>
            Enable them for <strong className="text-amber-50">Production</strong>{" "}
            (and Preview if you want).
          </li>
          <li>
            <strong className="text-amber-50">Deployments</strong> → open the
            latest → <strong className="text-amber-50">⋯</strong> →{" "}
            <strong className="text-amber-50">Redeploy</strong> (required so Next
            can embed the new public env vars).
          </li>
        </ol>
      </aside>
    );
  }

  return (
    <aside
      className="rounded-lg border border-amber-800/80 bg-amber-950/40 px-4 py-4 text-sm text-amber-100"
      role="status"
    >
      <p className="mb-2 font-medium text-amber-50">Connect Supabase (local dev)</p>
      <p className="mb-3 text-amber-100/95">
        Create <code className="text-amber-200">.env.local</code> next to{" "}
        <code className="text-amber-200">package.json</code> with your project
        URL and <strong className="text-amber-50">anon</strong> key from{" "}
        <a
          href="https://supabase.com/dashboard/project/_/settings/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 underline hover:text-emerald-300"
        >
          Supabase → Settings → API
        </a>
        .
      </p>
      <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-300">
        {`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...`}
      </pre>
      <p className="mt-3 text-amber-100/90">
        Save, stop the dev server (<kbd className="rounded bg-zinc-800 px-1 font-mono text-xs">Ctrl+C</kbd>
        ), run <code className="text-amber-200">npm run dev</code> again, refresh.
      </p>
      <p className="mt-3 text-xs text-amber-200/70">
        If this banner appears on your <strong>Vercel URL</strong>, use the
        Vercel env steps — <code className="text-amber-200/90">.env.local</code>{" "}
        does not apply there until you add variables in Vercel and redeploy.
      </p>
    </aside>
  );
}
