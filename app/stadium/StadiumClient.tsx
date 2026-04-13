"use client";

import { formatDollars } from "@/lib/format/money";
import {
  clampStadiumLevel,
  previewStadiumUpgrades,
  stadiumDailyIncomeCash,
  stadiumFanCapacity,
  stadiumPerformanceMultiplier,
  stadiumUpgradeCostCash,
  stadiumUpgradeDurationMs,
  STADIUM_MAX_LEVEL,
  type StadiumState,
} from "@/lib/game/stadium";
import type { Team, Upgrade } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const PREVIEW_ROWS = 10;

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

type ApiStadiumPayload = {
  ok?: boolean;
  team?: Team;
  stadium?: StadiumState;
  activeUpgrade?: Upgrade | null;
  income_applied?: number;
  error?: string;
};

type Props = {
  initialTeam: Team;
  initialStadium: StadiumState;
  initialUpgrade: Upgrade | null;
  initialIncomeApplied: number;
};

export function StadiumClient({
  initialTeam,
  initialStadium,
  initialUpgrade,
  initialIncomeApplied,
}: Props) {
  const [team, setTeam] = useState(initialTeam);
  const [stadium, setStadium] = useState(initialStadium);
  const [activeUpgrade, setActiveUpgrade] = useState<Upgrade | null>(
    initialUpgrade
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [incomeNote, setIncomeNote] = useState<string | null>(
    initialIncomeApplied > 0
      ? `+${formatDollars(initialIncomeApplied)} stadium income credited`
      : null
  );

  const refresh = useCallback(async () => {
    const res = await fetch("/api/stadium");
    const data = (await res.json()) as ApiStadiumPayload;
    if (!res.ok || !data.ok || !data.team || !data.stadium) {
      return;
    }
    setTeam(data.team);
    setStadium(data.stadium);
    setActiveUpgrade(data.activeUpgrade ?? null);
    if (data.income_applied && data.income_applied > 0) {
      setIncomeNote(
        `+${formatDollars(data.income_applied)} stadium income credited`
      );
    }
  }, []);

  useEffect(() => {
    if (!activeUpgrade) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [activeUpgrade]);

  useEffect(() => {
    if (!activeUpgrade) return;
    const id = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [activeUpgrade, refresh]);

  useEffect(() => {
    if (!incomeNote) return;
    const t = setTimeout(() => setIncomeNote(null), 8000);
    return () => clearTimeout(t);
  }, [incomeNote]);

  async function startUpgrade() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/stadium", { method: "POST" });
      const data = (await res.json()) as ApiStadiumPayload;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not start upgrade");
        return;
      }
      if (data.team) setTeam(data.team);
      if (data.stadium) setStadium(data.stadium);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const lv = clampStadiumLevel(team.stadium_level);
  const atMax = lv >= STADIUM_MAX_LEVEL;
  const nextCost = atMax ? 0 : stadiumUpgradeCostCash(lv);
  const nextDuration = atMax ? 0 : stadiumUpgradeDurationMs(lv);
  const previewRows = previewStadiumUpgrades(lv, PREVIEW_ROWS);

  const nextFan = atMax ? stadium.fan_capacity : stadiumFanCapacity(lv + 1);
  const nextIncome = atMax
    ? stadium.daily_income_cash
    : stadiumDailyIncomeCash(lv + 1);
  const nextPerf = atMax
    ? stadium.performance_multiplier
    : stadiumPerformanceMultiplier(lv + 1);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Stadium</h1>
        <p className="text-sm text-zinc-400">
          {team.name} ·{" "}
          <span className="text-zinc-200">{formatDollars(team.cash)}</span>
        </p>
        <p className="text-sm text-zinc-500">
          Levels 1–10. Each level raises fan capacity, daily passive income, and
          home defensive performance in match simulations. Upgrades cost dollars
          and finish after a real-time timer.
        </p>
      </div>

      {incomeNote && (
        <p
          className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200/90"
          role="status"
        >
          {incomeNote}
        </p>
      )}

      {activeUpgrade && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/25 p-4">
          <h2 className="text-sm font-medium text-amber-200">Upgrade in progress</h2>
          <p className="mt-2 text-sm text-zinc-300">
            Expanding to level{" "}
            <span className="font-mono text-white">{activeUpgrade.to_level}</span>
            · {formatRemaining(activeUpgrade.completes_at, tick)} remaining
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            You keep current bonuses until the timer completes.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Current level
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-white">
              {stadium.level}
              <span className="text-lg font-normal text-zinc-500">
                {" "}
                / {STADIUM_MAX_LEVEL}
              </span>
            </p>
          </div>
          <button
            type="button"
            disabled={atMax || !!activeUpgrade || team.cash < nextCost || busy}
            onClick={() => void startUpgrade()}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? "Starting…"
              : atMax
                ? "Max level"
                : activeUpgrade
                  ? "Upgrade running"
                  : `Upgrade · ${formatDollars(nextCost)} · ${formatDurationMs(nextDuration)}`}
          </button>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-zinc-950/60 px-3 py-3">
            <dt className="text-xs text-zinc-500">Fan capacity</dt>
            <dd className="mt-1 text-lg font-medium tabular-nums text-zinc-100">
              {stadium.fan_capacity.toLocaleString()}
            </dd>
            {!atMax && (
              <dd className="mt-0.5 text-xs text-emerald-400/80">
                → {nextFan.toLocaleString()} at Lv {lv + 1}
              </dd>
            )}
          </div>
          <div className="rounded-lg bg-zinc-950/60 px-3 py-3">
            <dt className="text-xs text-zinc-500">Income / day</dt>
            <dd className="mt-1 text-lg font-medium tabular-nums text-zinc-100">
              {formatDollars(stadium.daily_income_cash)}/day
            </dd>
            {!atMax && (
              <dd className="mt-0.5 text-xs text-emerald-400/80">
                → {formatDollars(nextIncome)}/day at Lv {lv + 1}
              </dd>
            )}
          </div>
          <div className="rounded-lg bg-zinc-950/60 px-3 py-3">
            <dt className="text-xs text-zinc-500">Home defense (sim)</dt>
            <dd className="mt-1 text-lg font-medium tabular-nums text-emerald-400/90">
              ×{stadium.performance_multiplier.toFixed(2)}
            </dd>
            {!atMax && (
              <dd className="mt-0.5 text-xs text-emerald-400/80">
                → ×{nextPerf.toFixed(2)} at Lv {lv + 1}
              </dd>
            )}
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Upgrade roadmap
        </h2>
        <p className="text-xs text-zinc-600">
          Each row is one paid upgrade job. Income is credited in full-day chunks
          when you load the stadium or hub (up to 14 days backlog).
        </p>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Reach Lv</th>
                <th className="px-3 py-2 font-medium">Fans</th>
                <th className="px-3 py-2 font-medium">Per day</th>
                <th className="px-3 py-2 font-medium">Def ×</th>
                <th className="px-3 py-2 font-medium text-right">Cost</th>
                <th className="px-3 py-2 font-medium text-right">Timer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-zinc-500">
                    Stadium is maxed out.
                  </td>
                </tr>
              ) : (
                previewRows.map((row) => (
                  <tr key={row.to_level}>
                    <td className="px-3 py-2 font-mono text-zinc-200">
                      {row.to_level}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.fan_capacity.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatDollars(row.daily_income_cash)}
                    </td>
                    <td className="px-3 py-2 font-mono text-emerald-400/90">
                      ×{row.performance_multiplier.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatDollars(row.cost_cash)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-500">
                      {formatDurationMs(row.duration_ms)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
