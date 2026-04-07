import { EnvHint } from "../components/EnvHint";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <EnvHint />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Hub</h1>
        <p className="text-zinc-400">
          Your franchise command center. Use the links above to move between
          stadium, squad, matches, and league.
        </p>
        <p className="text-sm text-zinc-500">
          Quick check: open{" "}
          <a
            href="/api/health"
            className="text-emerald-400 underline hover:text-emerald-300"
          >
            /api/health
          </a>{" "}
          — should show{" "}
          <code className="text-zinc-400">{`{"ok":true}`}</code>.
        </p>
      </div>
    </div>
  );
}
