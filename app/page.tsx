import Link from "next/link";
import { EnvHint } from "./components/EnvHint";

/** Home renders real content (no redirect) so the root URL always returns 200 in dev. */
export default function HomePage() {
  return (
    <div className="space-y-6">
      <EnvHint />
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-white">Gridiron Dynasty</h1>
        <p className="text-zinc-400">
          Football franchise strategy — use the nav above or jump to the hub.
        </p>
        <p className="text-sm text-zinc-500">
          Dev server URL is printed in the terminal after{" "}
          <code className="text-zinc-400">npm run dev</code> (often{" "}
          <code className="text-zinc-400">http://localhost:3000</code>). Use{" "}
          <strong className="text-zinc-400">http://</strong> (not https) unless
          you terminate TLS yourself. Match the <strong>port</strong> to what
          the terminal shows (3000, 3001, …).
        </p>
        <Link
          href="/dashboard"
          className="inline-flex text-emerald-400 underline hover:text-emerald-300"
        >
          Open dashboard →
        </Link>
      </div>
    </div>
  );
}
