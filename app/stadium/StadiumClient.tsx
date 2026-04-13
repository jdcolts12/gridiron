"use client";

import { formatDollars } from "@/lib/format/money";
import {
  clampStadiumLevel,
  HOME_FIELD_ADVANTAGE_TOOLTIP,
  homeFieldAdvantagePercent,
  previewStadiumUpgrades,
  stadiumCrowdNoiseLabel,
  stadiumDailyIncomeCash,
  stadiumFanCapacity,
  stadiumTierName,
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
      ? `+${formatDollars(initialIncomeApplied)} ticket revenue collected`
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
        `+${formatDollars(data.income_applied)} ticket revenue collected`
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
  const nextHfa = atMax
    ? stadium.home_field_advantage_percent
    : homeFieldAdvantagePercent(lv + 1);
  const nextCrowd = atMax
    ? stadium.crowd_noise_label
    : stadiumCrowdNoiseLabel(lv + 1);

  const upgradeTargetName = activeUpgrade
    ? stadiumTierName(activeUpgrade.to_level)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Franchise · Stadium
            </p>
            <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-bold leading-tight text-white sm:text-3xl">
              <span className="shrink-0" aria-hidden>
                🏟️
              </span>
              <span className="text-zinc-200">Your Stadium:</span>
              <span className="text-emerald-400">{stadium.tier_name}</span>
            </h1>
            <p className="text-sm text-zinc-400">
              Level{" "}
              <span className="font-mono text-zinc-200">{stadium.level}</span>
              <span className="text-zinc-500"> / {STADIUM_MAX_LEVEL}</span>
              <span className="text-zinc-600"> · </span>
              {team.name}
              <span className="text-zinc-600"> · </span>
              <span className="text-zinc-200">{formatDollars(team.cash)}</span>
            </p>
          </div>
          <button
            type="button"
            disabled={atMax || !!activeUpgrade || team.cash < nextCost || busy}
            onClick={() => void startUpgrade()}
            className="shrink-0 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? "Starting…"
              : atMax
                ? "Stadium maxed"
                : activeUpgrade
                  ? "Expansion running"
                  : `Expand · ${formatDollars(nextCost)} · ${formatDurationMs(nextDuration)}`}
          </button>
        </div>
        <p className="text-sm leading-relaxed text-zinc-500">
          Pack the stands, sell tickets, and crank the crowd until visiting teams
          can&apos;t hear the snap. Bigger venues take real money and construction
          time—each expansion level is a new chapter for your franchise.
        </p>
      </header>

      {incomeNote && (
        <p
          className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200/90"
          role="status"
        >
          {incomeNote}
        </p>
      )}

      {activeUpgrade && (
        <div className="rounded-xl border border-amber-800/50 bg-gradient-to-br from-amber-950/40 to-zinc-950/80 p-4">
          <h2 className="text-sm font-semibold text-amber-200">
            🏗️ Expansion in progress
          </h2>
          <p className="mt-2 text-sm text-zinc-300">
            Building toward{" "}
            <span className="font-medium text-white">
              {upgradeTargetName ?? `level ${activeUpgrade.to_level}`}
            </span>{" "}
            <span className="text-zinc-500">
              (level {activeUpgrade.to_level})
            </span>
            <span className="text-zinc-600"> · </span>
            {formatRemaining(activeUpgrade.completes_at, tick)} left on the clock
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Current ticket sales and home-field edge stay in place until the job
            wraps.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 to-zinc-950/90 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Gameday impact
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <span aria-hidden>💺</span> Stadium capacity
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
              {stadium.fan_capacity.toLocaleString()}
            </dd>
            {!atMax && (
              <dd className="mt-1 text-xs text-emerald-400/85">
                Next: {nextFan.toLocaleString()} seats at {stadiumTierName(lv + 1)}
              </dd>
            )}
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <span aria-hidden>💰</span> Ticket revenue / day
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
              {formatDollars(stadium.daily_income_cash)}
            </dd>
            {!atMax && (
              <dd className="mt-1 text-xs text-emerald-400/85">
                Next: {formatDollars(nextIncome)} / day
              </dd>
            )}
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <span aria-hidden>🏟️</span>
              <span
                className="cursor-help border-b border-dotted border-zinc-500"
                title={HOME_FIELD_ADVANTAGE_TOOLTIP}
              >
                Home field advantage
              </span>
            </dt>
            <dd
              className="mt-1 text-xl font-semibold tabular-nums text-emerald-400/95"
              title={HOME_FIELD_ADVANTAGE_TOOLTIP}
            >
              +{stadium.home_field_advantage_percent}%
            </dd>
            {!atMax && (
              <dd className="mt-1 text-xs text-emerald-400/85">
                Next: +{nextHfa}%
              </dd>
            )}
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <span aria-hidden>🔊</span> Crowd noise
            </dt>
            <dd className="mt-1 text-lg font-semibold text-amber-200/95">
              {stadium.crowd_noise_label}
            </dd>
            <dd className="mt-0.5 text-xs text-zinc-500">
              Road mistakes, false starts, shanked kicks—the rowdier it gets, the
              worse it is for them (coming soon in sim).
            </dd>
            {!atMax && (
              <dd className="mt-1 text-xs text-emerald-400/85">
                Next: {nextCrowd}
              </dd>
            )}
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <span aria-hidden>🏟️</span> Stadium expansion plan
        </h2>
        <p className="text-xs text-zinc-600">
          Each row is one construction project. Ticket money pays out in full-day
          chunks when you hit the stadium or hub (up to 14 days banked).
        </p>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/70 text-xs text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Venue</th>
                <th className="px-3 py-2 font-medium">💺 Seats</th>
                <th className="px-3 py-2 font-medium">💰 Tickets</th>
                <th className="px-3 py-2 font-medium">🏟️ HFA</th>
                <th className="px-3 py-2 font-medium">🔊 Crowd</th>
                <th className="px-3 py-2 font-medium text-right">Cost</th>
                <th className="px-3 py-2 font-medium text-right">Build</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {previewRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-zinc-500"
                  >
                    You&apos;ve maxed the dynasty stadium. Time to defend the
                    house.
                  </td>
                </tr>
              ) : (
                previewRows.map((row) => (
                  <tr key={row.to_level} className="hover:bg-zinc-900/40">
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-100">
                        {row.tier_name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Level {row.to_level}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.fan_capacity.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatDollars(row.daily_income_cash)}
                    </td>
                    <td className="px-3 py-2 font-medium text-emerald-400/90">
                      +{row.home_field_advantage_percent}%
                    </td>
                    <td className="px-3 py-2 text-sm text-amber-200/90">
                      {row.crowd_noise_label}
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
