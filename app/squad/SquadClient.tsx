"use client";

import { formatDollars } from "@/lib/format/money";
import { playerArchetype } from "@/lib/game/playerArchetype";
import {
  computeDepthChart,
  playerOverall,
  playerTrainingCostCash,
  playerTrainingDurationMs,
  tierStars,
  TRAINING_DELTA,
} from "@/lib/game/squadHelpers";
import type { Player, PlayerUpgradeJob, Team } from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  initialTeam: Team;
  initialPlayers: Player[];
  initialJobs: PlayerUpgradeJob[];
  initialTeamOvr: number;
};

function developmentLevel(playerId: string, jobs: PlayerUpgradeJob[]): number {
  return 1 + jobs.filter((j) => j.completed && j.player_id === playerId).length;
}

function formatDurationMs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m <= 0) return `${sec}s`;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

function formatRemaining(completesAtIso: string, now: number): string {
  const ms = new Date(completesAtIso).getTime() - now;
  if (ms <= 0) return "Finishing…";
  return formatDurationMs(ms);
}

export default function SquadClient({
  initialTeam,
  initialPlayers,
  initialJobs,
  initialTeamOvr,
}: Props) {
  const [team, setTeam] = useState(initialTeam);
  const [players, setPlayers] = useState(initialPlayers);
  const [jobs, setJobs] = useState(initialJobs);
  const [teamOvr, setTeamOvr] = useState(initialTeamOvr);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const now = Date.now();

  const activeByPlayer = useMemo(() => {
    const m = new Map<string, PlayerUpgradeJob>();
    for (const j of jobs) {
      if (j.completed) continue;
      if (!m.has(j.player_id)) m.set(j.player_id, j);
    }
    return m;
  }, [jobs]);

  const hasIncompleteTraining = activeByPlayer.size > 0;

  useEffect(() => {
    if (!hasIncompleteTraining) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasIncompleteTraining]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/squad", { cache: "no-store" });
    const data = (await res.json()) as {
      ok?: boolean;
      team?: Team;
      players?: Player[];
      jobs?: PlayerUpgradeJob[];
      team_ovr?: number;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.team || !data.players) {
      if (data.error) setBanner(data.error);
      return;
    }
    setTeam(data.team);
    setPlayers(data.players);
    setJobs(data.jobs ?? []);
    if (typeof data.team_ovr === "number") setTeamOvr(data.team_ovr);
    setBanner(null);
  }, []);

  useEffect(() => {
    if (!hasIncompleteTraining) return;
    const id = window.setInterval(refresh, 8000);
    return () => window.clearInterval(id);
  }, [hasIncompleteTraining, refresh]);

  const { starters, bench } = useMemo(
    () => computeDepthChart(players),
    [players]
  );

  async function startUpgrade(playerId: string) {
    setBusyId(playerId);
    setBanner(null);
    try {
      const res = await fetch("/api/squad/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        team?: Team;
        job?: PlayerUpgradeJob;
      };
      if (!res.ok || !data.ok) {
        setBanner(data.error ?? "Could not start training");
        return;
      }
      if (data.team) setTeam(data.team);
      if (data.job) setJobs((prev) => [data.job!, ...prev]);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Team overall
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-emerald-400">
          {teamOvr}{" "}
          <span className="text-lg font-semibold text-zinc-400">OVR</span>
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          {team.name} · {formatDollars(team.cash)} · Gems {team.gems}
        </p>
      </div>

      {banner && (
        <div
          className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          {banner}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Starting lineup</h2>
        <p className="text-sm text-zinc-500">
          Your best eleven by position. Tap a card to focus. Training grants +{TRAINING_DELTA.speed}{" "}
          Speed, +{TRAINING_DELTA.strength} Strength, +{TRAINING_DELTA.passing} Play awareness, +
          {TRAINING_DELTA.catching} Catching, +{TRAINING_DELTA.stamina} Stamina after the timer.
        </p>
        {starters.length === 0 ? (
          <p className="text-sm text-zinc-500">No starters yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {starters.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                focused={focusId === p.id}
                onSelect={() =>
                  setFocusId((id) => (id === p.id ? null : p.id))
                }
                level={developmentLevel(p.id, jobs)}
                activeJob={activeByPlayer.get(p.id)}
                now={now}
                canAfford={team.cash >= playerTrainingCostCash(p.tier)}
                upgrading={busyId === p.id}
                onUpgrade={() => startUpgrade(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Bench</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {bench.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              focused={focusId === p.id}
              onSelect={() =>
                setFocusId((id) => (id === p.id ? null : p.id))
              }
              level={developmentLevel(p.id, jobs)}
              activeJob={activeByPlayer.get(p.id)}
              now={now}
              canAfford={team.cash >= playerTrainingCostCash(p.tier)}
              upgrading={busyId === p.id}
              onUpgrade={() => startUpgrade(p.id)}
            />
          ))}
        </div>
        {bench.length === 0 && starters.length > 0 && (
          <p className="text-sm text-zinc-500">No bench — full roster is starting.</p>
        )}
      </section>
    </div>
  );
}

function PlayerCard({
  player: p,
  focused,
  onSelect,
  level,
  activeJob,
  now,
  canAfford,
  upgrading,
  onUpgrade,
}: {
  player: Player;
  focused: boolean;
  onSelect: () => void;
  level: number;
  activeJob?: PlayerUpgradeJob;
  now: number;
  canAfford: boolean;
  upgrading: boolean;
  onUpgrade: () => void;
}) {
  const arch = playerArchetype(p);
  const ovr = playerOverall(p);
  const cost = playerTrainingCostCash(p.tier);
  const durationMs = playerTrainingDurationMs(p.tier);
  const inProgress = Boolean(activeJob);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`rounded-xl border bg-zinc-900/50 p-4 text-left outline-none transition hover:border-zinc-600 ${
        focused
          ? "border-emerald-500 ring-2 ring-emerald-500/40"
          : "border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-emerald-400/90">{p.position}</p>
          <h3 className="text-lg font-semibold text-white">{p.name}</h3>
          <p className="text-sm text-zinc-400">
            {arch.emoji} {arch.label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-white">{ovr}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            OVR
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        {tierStars(p.tier)} Tier {p.tier} · Level {level}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <Stat label="Speed" emoji="⚡" value={p.speed} />
        <Stat label="Strength" emoji="💪" value={p.strength} />
        <Stat label="Play awareness" emoji="🧠" value={p.passing} />
        <Stat label="Catching" emoji="🧤" value={p.catching} />
        <Stat label="Stamina" emoji="🔋" value={p.stamina} className="col-span-2" />
      </dl>

      <div className="mt-4 border-t border-zinc-800 pt-4">
        {inProgress && activeJob ? (
          <p className="text-sm text-amber-200">
            Training… {formatRemaining(activeJob.completes_at, now)}
          </p>
        ) : (
          <button
            type="button"
            disabled={upgrading || !canAfford}
            onClick={(e) => {
              e.stopPropagation();
              onUpgrade();
            }}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {upgrading
              ? "Starting…"
              : `Upgrade — ${formatDollars(cost)} (${formatDurationMs(durationMs)})`}
          </button>
        )}
        {!inProgress && !canAfford && (
          <p className="mt-2 text-xs text-zinc-500">Not enough cash for training.</p>
        )}
      </div>
    </article>
  );
}

function Stat({
  label,
  emoji,
  value,
  className = "",
}: {
  label: string;
  emoji: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-zinc-500">
        {label} {emoji}
      </dt>
      <dd className="font-mono text-base font-medium tabular-nums text-zinc-100">
        {value}
      </dd>
    </div>
  );
}
