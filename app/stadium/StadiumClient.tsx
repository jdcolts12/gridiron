"use client";

import {
  facilityEffectDescription,
  facilityEffectTitle,
  facilityMultiplier,
} from "@/lib/game/facilityBonuses";
import {
  type FacilityType,
  FACILITY_TYPES,
  FACILITY_PREVIEW_STEPS,
  MAX_FACILITY_LEVEL,
  currentLevelForType,
  previewFacilityUpgrades,
  upgradeCostCash,
  upgradeDurationMs,
} from "@/lib/game/upgrades";
import type { Team, Upgrade } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const FACILITY_COPY: Record<
  FacilityType,
  { title: string; short: string; glyph: string; panel: string }
> = {
  stadium: {
    title: "Stadium",
    short: "Crowd & facilities help your defense at home.",
    glyph: "🏟️",
    panel: "border-amber-800/60 bg-gradient-to-b from-amber-950/40 to-zinc-950/80",
  },
  training: {
    title: "Training complex",
    short: "Line play, conditioning, and trench control.",
    glyph: "🏋️",
    panel: "border-sky-800/60 bg-gradient-to-b from-sky-950/35 to-zinc-950/80",
  },
  coaching: {
    title: "Coaching staff",
    short: "Game planning and offensive execution.",
    glyph: "📋",
    panel: "border-violet-800/60 bg-gradient-to-b from-violet-950/35 to-zinc-950/80",
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

function multLabel(m: number): string {
  return `×${m.toFixed(2)}`;
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
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Stadium & facilities</h1>
        <p className="text-sm text-zinc-400">
          {team.name} · Cash{" "}
          <span className="text-zinc-200">{team.cash.toLocaleString()}</span>
        </p>
        <p className="max-w-2xl text-sm text-zinc-500">
          Three buildings define how your club is rated inside the match simulator.
          Below is your current footprint and a roadmap of the next upgrades—cost,
          build time, and the power multiplier at each target level.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Your facilities
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {FACILITY_TYPES.map((type) => {
            const lv = currentLevelForType(team, type);
            const m = facilityMultiplier(type, lv);
            const { title, short, glyph, panel } = FACILITY_COPY[type];
            return (
              <div
                key={type}
                className={`rounded-xl border p-4 ${panel}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl leading-none" aria-hidden>
                    {glyph}
                  </span>
                  <span className="rounded-full bg-zinc-950/60 px-2 py-0.5 font-mono text-xs text-zinc-300">
                    Lv {lv}
                  </span>
                </div>
                <h3 className="mt-3 font-medium text-white">{title}</h3>
                <p className="mt-1 text-xs text-zinc-400">{short}</p>
                <p className="mt-3 text-sm text-zinc-300">
                  <span className="text-zinc-500">{facilityEffectTitle(type)}: </span>
                  <span className="font-mono text-emerald-400/90">{multLabel(m)}</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

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

      <section className="space-y-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Upgrades & roadmap
        </h2>

        <div className="space-y-8">
          {FACILITY_TYPES.map((type) => {
            const lv = currentLevelForType(team, type);
            const atMax = lv >= MAX_FACILITY_LEVEL;
            const cost = upgradeCostCash(lv);
            const dur = upgradeDurationMs(lv);
            const busy = busyType === type;
            const inProg = activeByType[type];
            const { title, glyph, panel } = FACILITY_COPY[type];
            const nowMult = facilityMultiplier(type, lv);
            const nextMult = atMax ? nowMult : facilityMultiplier(type, lv + 1);
            const previewRows = previewFacilityUpgrades(
              type,
              lv,
              FACILITY_PREVIEW_STEPS
            );

            return (
              <div
                key={type}
                className={`overflow-hidden rounded-xl border ${panel}`}
              >
                <div className="border-b border-zinc-800/80 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4">
                  <div className="flex gap-3">
                    <span className="text-3xl" aria-hidden>
                      {glyph}
                    </span>
                    <div>
                      <h3 className="text-lg font-medium text-white">{title}</h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {facilityEffectDescription(type)}
                      </p>
                      <p className="mt-2 text-sm text-zinc-300">
                        Now:{" "}
                        <span className="font-mono text-emerald-400/90">
                          {multLabel(nowMult)}
                        </span>{" "}
                        {facilityEffectTitle(type).toLowerCase()} · Level{" "}
                        <span className="text-zinc-100">{lv}</span>
                        {!atMax && (
                          <>
                            {" "}
                            → next{" "}
                            <span className="font-mono text-emerald-300/90">
                              {multLabel(nextMult)}
                            </span>{" "}
                            at Lv {lv + 1}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={atMax || !!inProg || team.cash < cost || busy}
                    onClick={() => void start(type)}
                    className="mt-4 w-full shrink-0 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 sm:mt-0 sm:w-auto"
                  >
                    {busy
                      ? "Starting…"
                      : inProg
                        ? "Upgrade in progress"
                        : atMax
                          ? "Max level"
                          : `Start upgrade · ${cost.toLocaleString()} cash · ${formatDurationMs(dur)}`}
                  </button>
                </div>

                <div className="p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Next steps (preview)
                  </p>
                  {previewRows.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      No further levels (max {MAX_FACILITY_LEVEL}).
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-950/40">
                      <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
                        <thead className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
                          <tr>
                            <th className="px-3 py-2 font-medium">Reach level</th>
                            <th className="px-3 py-2 font-medium">
                              {facilityEffectTitle(type)} (sim)
                            </th>
                            <th className="px-3 py-2 font-medium text-right">
                              Cost
                            </th>
                            <th className="px-3 py-2 font-medium text-right">
                              Build time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                          {previewRows.map((row) => (
                            <tr key={row.toLevel}>
                              <td className="px-3 py-2 font-mono text-zinc-200">
                                {row.toLevel}
                              </td>
                              <td className="px-3 py-2 font-mono text-emerald-400/90">
                                {multLabel(row.multiplier)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {row.cost.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right text-zinc-400">
                                {formatDurationMs(row.durationMs)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-zinc-600">
                    Each row is one upgrade job. Cost and time are for that single
                    step; multiplier is your rating after that level completes.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
