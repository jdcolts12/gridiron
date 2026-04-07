"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setLoading(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Could not create team");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Name your franchise</h1>
        <p className="mt-2 text-sm text-zinc-400">
          We&apos;ll create your team and a starter squad of 15 football players
          (QB, RB, WR, TE, OL, DL, LB, DB).
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="team" className="mb-1 block text-sm text-zinc-400">
            Team name
          </label>
          <input
            id="team"
            type="text"
            required
            minLength={2}
            maxLength={48}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. North End United"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Start franchise"}
        </button>
      </form>
    </div>
  );
}
