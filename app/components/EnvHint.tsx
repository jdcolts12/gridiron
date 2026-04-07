"use client";

/**
 * Shows step-by-step Supabase setup when public env vars are missing.
 */
export function EnvHint() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
  if (configured) return null;

  return (
    <aside
      className="rounded-lg border border-amber-800/80 bg-amber-950/40 px-4 py-4 text-sm text-amber-100"
      role="status"
    >
      <p className="mb-3 font-medium text-amber-50">
        Connect Supabase (takes about two minutes)
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-amber-100/95">
        <li>
          Open{" "}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline hover:text-emerald-300"
          >
            supabase.com/dashboard
          </a>{" "}
          and sign in. Open your project (or create one with{" "}
          <strong className="text-amber-50">New project</strong>).
        </li>
        <li>
          In the left sidebar, click the{" "}
          <strong className="text-amber-50">gear icon</strong> →{" "}
          <strong className="text-amber-50">Project Settings</strong> →{" "}
          <strong className="text-amber-50">API</strong>.
        </li>
        <li>
          Under <strong className="text-amber-50">Project URL</strong>, click
          copy. That value is your URL.
        </li>
        <li>
          Scroll to <strong className="text-amber-50">Project API keys</strong>.
          Copy the long key labeled{" "}
          <strong className="text-amber-50">anon</strong>{" "}
          <span className="text-amber-200/80">(public)</span> — not the{" "}
          <code className="text-amber-200">service_role</code> key.
        </li>
        <li>
          On your computer, in the{" "}
          <strong className="text-amber-50">Gridiron Dynasty</strong> folder
          (same place as <code className="text-amber-200">package.json</code>
          ), open or create the file{" "}
          <code className="rounded bg-zinc-900 px-1 py-0.5 text-amber-200">
            .env.local
          </code>{" "}
          in Cursor/VS Code or any text editor.
        </li>
        <li>
          Paste two lines (no quotes around the values):
          <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-300">
            {`NEXT_PUBLIC_SUPABASE_URL=paste-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste-anon-key-here`}
          </pre>
        </li>
        <li>
          Save the file. In the terminal where the app runs, press{" "}
          <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs">
            Ctrl+C
          </kbd>{" "}
          to stop, then run{" "}
          <code className="text-amber-200">npm run dev</code> again. Refresh
          this page — the yellow box should disappear.
        </li>
      </ol>
    </aside>
  );
}
