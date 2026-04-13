"use client";

import type { Json, Match } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

type Opponent = { id: string; name: string };

type MatchRow = Match & { opponent_name?: string | null };

function logLines(log: Json | null): string[] {
  if (log === null || log === undefined) return [];
  if (!Array.isArray(log)) return [String(log)];
  return log.map((e) => {
    if (e && typeof e === "object") {
      const o = e as Record<string, unknown>;
      if (typeof o.description === "string") {
        const tick =
          typeof o.minute === "number" ? `[${o.minute}] ` : "";
        return `${tick}${o.description}`;
      }
    }
    return JSON.stringify(e);
  });
}

export function MatchClient() {
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [oppLoading, setOppLoading] = useState(true);
  const [oppError, setOppError] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [lastMatch, setLastMatch] = useState<Match | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [recent, setRecent] = useState<MatchRow[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await fetch("/api/match");
      const data = (await res.json()) as {
        ok?: boolean;
        teamId?: string;
        matches?: MatchRow[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setRecent([]);
        setMyTeamId(null);
        return;
      }
      setMyTeamId(data.teamId ?? null);
      setRecent(data.matches ?? []);
    } catch {
      setRecent([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOppLoading(true);
      setOppError(null);
      try {
        const res = await fetch("/api/opponents");
        const data = (await res.json()) as {
          ok?: boolean;
          teams?: Opponent[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setOpponents([]);
          setOppError(data.error ?? "Could not load opponents");
          return;
        }
        setOpponents(data.teams ?? []);
      } catch {
        if (!cancelled) {
          setOpponents([]);
          setOppError("Network error loading opponents");
        }
      } finally {
        if (!cancelled) setOppLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const effectiveOpponentId =
    selectedId.trim() || manualId.trim() || "";

  async function play() {
    setPlayError(null);
    setLastMatch(null);
    if (!effectiveOpponentId) {
      setPlayError("Pick an opponent or paste a team UUID.");
      return;
    }
    setPlaying(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentTeamId: effectiveOpponentId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        match?: Match;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.match) {
        setPlayError(data.error ?? "Match failed");
        return;
      }
      setLastMatch(data.match);
      await loadRecent();
    } catch {
      setPlayError("Network error");
    } finally {
      setPlaying(false);
    }
  }

  function resultLabel(m: MatchRow): string {
    if (!myTeamId) return "—";
    if (m.winner_id === null) return "Draw";
    if (m.winner_id === myTeamId) return "Win";
    return "Loss";
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Match</h1>
        <p className="text-sm text-zinc-400">
          Your team is always <span className="text-zinc-300">home</span>. You
          need <code className="text-zinc-500">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          on the server to load opponents and simulate.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-medium text-zinc-300">Play a game</h2>
        {oppLoading ? (
          <p className="text-sm text-zinc-500">Loading opponents…</p>
        ) : opponents.length > 0 ? (
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Opponent</span>
            <select
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Select…</option>
              {opponents.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-amber-400/90">
            {oppError ??
              "No other teams yet. Create another account or paste a team UUID below."}
          </p>
        )}

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Opponent team ID (optional)</span>
          <input
            type="text"
            placeholder="uuid…"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
          />
        </label>

        <button
          type="button"
          onClick={() => void play()}
          disabled={playing}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {playing ? "Simulating…" : "Simulate match"}
        </button>

        {playError && (
          <p className="text-sm text-red-400" role="alert">
            {playError}
          </p>
        )}
      </div>

      {lastMatch && (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-sm font-medium text-zinc-300">Result</h2>
          <p className="text-lg text-white">
            {lastMatch.home_score} – {lastMatch.away_score}
            {lastMatch.winner_id === null && (
              <span className="ml-2 text-sm font-normal text-zinc-400">
                Draw
              </span>
            )}
          </p>
          <div className="max-h-64 overflow-y-auto rounded border border-zinc-800 bg-zinc-950/80 p-3 font-mono text-xs text-zinc-400">
            {logLines(lastMatch.match_log).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Recent games</h2>
        {recentLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-zinc-500">No matches yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-zinc-800/80 px-3 py-2 text-zinc-300"
              >
                <span>
                  {m.opponent_name ? (
                    <>vs {m.opponent_name}</>
                  ) : (
                    <>vs opponent</>
                  )}
                  <span className="ml-2 text-zinc-100">
                    {m.home_score} – {m.away_score}
                  </span>
                </span>
                <span className="text-xs text-zinc-500">
                  {resultLabel(m)} ·{" "}
                  {new Date(m.played_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
