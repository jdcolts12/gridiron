"use client";

import {
  type FacilityType,
  FACILITY_TYPES,
  MAX_FACILITY_LEVEL,
  currentLevelForType,
  upgradeCostCash,
  upgradeDurationMs,
} from "@/lib/game/upgrades";
import type { Team, Upgrade } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const FACILITY_COPY: Record<
  FacilityType,
  { title: string; blurb: string }
> = {
  stadium: {
    title: "Stadium",
    blurb: "Boosts home defense in simulations.",
  },
  training: {
    title: "Training",
    blurb: "Improves trench and physical play.",
  },
  coaching: {
    title: "Coaching",
    blurb: "Sharpens offensive output.",
  },
};

function formatRemaining(completesAt: string, tick: number): string {
  void tick;
  const ms = new Date(completesAt).getTime() - Date.now();
  if (ms <= 0) return "Finishing…";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 120) return `${Math.floor(m / 60)}h ${m % 60}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

function formatDurationMs(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

type Props = {
  initialTeam: Team;
  initialActive: Upgrade[];
};

export function StadiumClient({ initialTeam, initialActive }: Props) {
  const [team, setTeam] = useState(initialTeam);
  const [active, setActive] = useState(initialActive);
  const [error, setError] = useState<string | null>(null);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/upgrade");
    const data = (await res.json()) as {
      ok?: boolean;
      team?: Team;
      activeUpgrades?: Upgrade[];
    };
    if (data.ok && data.team) {
      setTeam(data.team);
      setActive(data.activeUpgrades ?? []);
    }
  }, []);

  useEffect(() => {
    if (active.length === 0) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active.length]);

  useEffect(() => {
    if (active.length === 0) return;
    const id = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [active.length, refresh]);

  async function start(type: FacilityType) {
    setError(null);
    setBusyType(type);
    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; team?: Team };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Upgrade failed");
        return;
      }
      if (data.team) setTeam(data.team);
      await refresh();
    } finally {
      setBusyType(null);
    }
  }

  const activeByType = Object.fromEntries(active.map((u) => [u.type, u])) as Record<
    string,
    Upgrade | undefined
  >;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Stadium & facilities</h1>
        <p className="text-sm text-zinc-400">
          {team.name} · Cash{" "}
          <span className="text-zinc-200">{team.cash.toLocaleString()}</span>
        </p>
      </div>

      {active.length > 0 && (
        <div className="space-y-2 rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
          <h2 className="text-sm font-medium text-amber-200/90">In progress</h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            {active.map((u) => (
              <li key={u.id} className="flex flex-wrap justify-between gap-2">
                <span className="capitalize">{u.type}</span>
                <span className="text-zinc-400">
                  Lv {u.from_level} → {u.to_level} ·{" "}
                  {formatRemaining(u.completes_at, tick)} left
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-1">
        {FACILITY_TYPES.map((type) => {
          const lv = currentLevelForType(team, type);
          const atMax = lv >= MAX_FACILITY_LEVEL;
          const cost = upgradeCostCash(lv);
          const dur = upgradeDurationMs(lv);
          const busy = busyType === type;
          const inProg = activeByType[type];
          const { title, blurb } = FACILITY_COPY[type];

          return (
            <div
              key={type}
              className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-medium text-white">{title}</h2>
                  <p className="mt-0.5 text-sm text-zinc-500">{blurb}</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Level <span className="text-zinc-100">{lv}</span>
                    {atMax && (
                      <span className="ml-2 text-emerald-400/90">(max)</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    atMax || !!inProg || team.cash < cost || busy
                  }
                  onClick={() => void start(type)}
                  className="shrink-0 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy
                    ? "Starting…"
                    : inProg
                      ? "Upgrading…"
                      : atMax
                        ? "Maxed"
                        : `Upgrade · ${cost.toLocaleString()} · ${formatDurationMs(dur)}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
