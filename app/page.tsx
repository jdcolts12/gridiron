import Link from "next/link";
import { EnvHint } from "./components/EnvHint";

const isDev = process.env.NODE_ENV === "development";

/** Home renders real content (no redirect) so the root URL always returns 200. */
export default function HomePage() {
  return (
    <div className="space-y-6">
      <EnvHint />
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-white">Gridiron Dynasty</h1>
        <p className="text-zinc-400">
          Football franchise strategy — sign in, build your squad, and play
          matches.
        </p>
        {isDev && (
          <p className="text-sm text-zinc-500">
            Local dev: after{" "}
            <code className="text-zinc-400">npm run dev</code>, open the URL
            from the terminal (this project defaults to port{" "}
            <code className="text-zinc-400">3333</code>).
          </p>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/login"
            className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            Create account
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-emerald-400 underline hover:text-emerald-300"
          >
            Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
