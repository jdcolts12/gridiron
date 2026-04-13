import { FACILITY_BONUS_RATE } from "@/lib/game/facilityBonuses";
import { clampStadiumLevel } from "@/lib/game/stadium";
import type { Player, Team } from "@/lib/types";

/** Team row plus full squad for power calculations and event attribution. */
export type TeamWithSquad = Team & { players: Player[] };

/** Football replay events (stored in `match_log` jsonb). */
export type MatchEvent = {
  minute: number;
  type:
    | "touchdown"
    | "incomplete"
    | "pass_breakup"
    | "penalty"
    | "flag";
  teamId: string;
  playerId: string;
  description: string;
};

export type MatchResult = {
  homeScore: number;
  awayScore: number;
  winnerId: string | null;
  matchLog: MatchEvent[];
};

export type QuickMatchResult = {
  homeScore: number;
  awayScore: number;
  winnerId: string | null;
};

const TICKS = 18;
/** Max touchdowns per team in this abstract game. */
const MAX_TOUCHDOWNS_PER_TEAM = 7;
const PENALTY_ROLL = 0.07;
const FLAG_ROLL = 0.035;

function normPos(p: Player): string {
  return p.position.trim().toUpperCase();
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)]!;
}

function varianceFactor(): number {
  return 0.85 + Math.random() * 0.3;
}

type Powers = {
  attack: number;
  defense: number;
  /** Line-of-scrimmage / trench control (replaces “midfield”). */
  trench: number;
};

function isOffensiveSkill(p: Player): boolean {
  const n = normPos(p);
  return ["QB", "WR", "RB", "TE"].includes(n);
}

function isDefensiveFront(p: Player): boolean {
  const n = normPos(p);
  return ["DL", "LB", "DB", "S"].includes(n);
}

function isTrench(p: Player): boolean {
  const n = normPos(p);
  return n === "OL";
}

function offensiveContribution(p: Player): number {
  const n = normPos(p);
  if (n === "QB") return (p.passing + p.speed) / 2;
  return p.speed + p.catching;
}

function computePowers(
  team: TeamWithSquad,
  side: "home" | "away",
  trenchWinner: "home" | "away" | "tie"
): Powers {
  const players = team.players;
  const off = players.filter(isOffensiveSkill);
  const def = players.filter(isDefensiveFront);
  const trench = players.filter(isTrench);

  const attackBase = avg(off.map(offensiveContribution));
  const coachingBonus = 1 + team.coaching_level * FACILITY_BONUS_RATE.coaching;
  let attack = attackBase * coachingBonus;
  if (
    (trenchWinner === "home" && side === "home") ||
    (trenchWinner === "away" && side === "away")
  ) {
    attack *= 1.15;
  }

  const defenseBase = avg(def.map((p) => p.strength + p.stamina));
  const stadiumLv = clampStadiumLevel(team.stadium_level);
  const stadiumBonus = 1 + stadiumLv * FACILITY_BONUS_RATE.stadium;
  const defense = defenseBase * stadiumBonus;

  const trenchBase = avg(trench.map((p) => p.passing + p.stamina));
  const trainingBonus = 1 + team.training_level * FACILITY_BONUS_RATE.training;
  const trenchRating = trenchBase * trainingBonus;

  return { attack, defense, trench: trenchRating };
}

function trenchAdvantage(
  homeTrench: number,
  awayTrench: number
): "home" | "away" | "tie" {
  if (homeTrench > awayTrench) return "home";
  if (awayTrench > homeTrench) return "away";
  return "tie";
}

function homeHasPossessionThisTick(
  tickIndex: number,
  homeTrench: number,
  awayTrench: number
): boolean {
  const ε = 0.01;
  let homeW = homeTrench + ε;
  let awayW = awayTrench + ε;
  if (tickIndex % 2 === 0) {
    homeW *= 1.1;
    awayW *= 0.9;
  } else {
    homeW *= 0.9;
    awayW *= 1.1;
  }
  const t = Math.random() * (homeW + awayW);
  return t < homeW;
}

function pickSkillPlayer(attackers: Player[]): Player | undefined {
  const skill = attackers.filter((p) =>
    ["WR", "RB", "TE"].includes(normPos(p))
  );
  const qb = attackers.filter((p) => normPos(p) === "QB");
  if (qb.length && Math.random() < 0.2) return pickRandom(qb);
  if (skill.length && qb.length) {
    return Math.random() < 0.65 ? pickRandom(skill) : pickRandom(qb);
  }
  return pickRandom(skill) ?? pickRandom(qb) ?? pickRandom(attackers);
}

function pickDefender(defenders: Player[]): Player | undefined {
  const secondary = defenders.filter((p) =>
    ["DB", "S"].includes(normPos(p))
  );
  const front = defenders.filter((p) =>
    ["DL", "LB"].includes(normPos(p))
  );
  if (secondary.length && Math.random() < 0.55) return pickRandom(secondary);
  return pickRandom(front) ?? pickRandom(secondary) ?? pickRandom(defenders);
}

function pickAny(players: Player[]): Player | undefined {
  return pickRandom(players);
}

function tdDescription(name: string): string {
  const lines = [
    `${name} takes it in — TOUCHDOWN!`,
    `${name} finds the end zone! Touchdown!`,
    `${name} dives across the goal line — six!`,
    `${name} breaks a tackle and scores! Touchdown!`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function incompleteDescription(name: string): string {
  const lines = [
    `${name} can’t connect — incomplete.`,
    `${name} throws it away under pressure.`,
    `${name} overshoots the receiver — incomplete.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function breakupDescription(defName: string, offName: string): string {
  return `${defName} breaks up the pass intended for ${offName}!`;
}

function penaltyDescription(name: string): string {
  return `Flag on the play — ${name}.`;
}

function flagDescription(name: string): string {
  return `${name} flagged for a personal foul.`;
}

function runTicks(
  homeTeam: TeamWithSquad,
  awayTeam: TeamWithSquad,
  collectLog: boolean
): { homeScore: number; awayScore: number; matchLog: MatchEvent[] } {
  const homePre = computePowers(homeTeam, "home", "tie");
  const awayPre = computePowers(awayTeam, "away", "tie");
  const trenchWin = trenchAdvantage(homePre.trench, awayPre.trench);

  const homePow = computePowers(homeTeam, "home", trenchWin);
  const awayPow = computePowers(awayTeam, "away", trenchWin);

  let homeScore = 0;
  let awayScore = 0;
  const matchLog: MatchEvent[] = [];

  const push = (e: MatchEvent) => {
    if (collectLog) matchLog.push(e);
  };

  for (let t = 0; t < TICKS; t++) {
    const minute = (t + 1) * 5;
    const homePossession = homeHasPossessionThisTick(
      t,
      homePow.trench,
      awayPow.trench
    );

    const atkTeam = homePossession ? homeTeam : awayTeam;
    const defTeam = homePossession ? awayTeam : homeTeam;
    const atkPow = homePossession ? homePow : awayPow;
    const defPow = homePossession ? awayPow : homePow;

    const attTick = atkPow.attack * varianceFactor();
    const defTick = defPow.defense * varianceFactor();
    const denom = attTick + defTick + 1e-6;
    const scoreChance = Math.min(0.95, Math.max(0, attTick / denom));

    if (Math.random() < scoreChance) {
      const ballCarrier = pickSkillPlayer(atkTeam.players);
      const defender = pickDefender(defTeam.players);
      if (!ballCarrier) continue;

      const sub = Math.random();
      if (sub < 0.38) {
        const canScore = homePossession
          ? homeScore < MAX_TOUCHDOWNS_PER_TEAM
          : awayScore < MAX_TOUCHDOWNS_PER_TEAM;
        if (canScore) {
          if (homePossession) homeScore += 1;
          else awayScore += 1;
          push({
            minute,
            type: "touchdown",
            teamId: atkTeam.id,
            playerId: ballCarrier.id,
            description: tdDescription(ballCarrier.name),
          });
        } else {
          const d = defender?.name ?? "The defense";
          push({
            minute,
            type: "pass_breakup",
            teamId: defTeam.id,
            playerId: defender?.id ?? ballCarrier.id,
            description: `${d} stands up — no more scores today.`,
          });
        }
      } else if (sub < 0.7) {
        const d = defender ?? pickRandom(defTeam.players);
        if (d) {
          push({
            minute,
            type: "pass_breakup",
            teamId: defTeam.id,
            playerId: d.id,
            description: breakupDescription(d.name, ballCarrier.name),
          });
        }
      } else {
        push({
          minute,
          type: "incomplete",
          teamId: atkTeam.id,
          playerId: ballCarrier.id,
          description: incompleteDescription(ballCarrier.name),
        });
      }
    }

    if (Math.random() < PENALTY_ROLL) {
      const side = Math.random() < 0.45 ? atkTeam : defTeam;
      const player = pickAny(side.players);
      if (player) {
        push({
          minute,
          type: "penalty",
          teamId: side.id,
          playerId: player.id,
          description: penaltyDescription(player.name),
        });
      }
    }

    if (Math.random() < FLAG_ROLL) {
      const side = Math.random() < 0.5 ? atkTeam : defTeam;
      const player = pickAny(side.players);
      if (player) {
        push({
          minute,
          type: "flag",
          teamId: side.id,
          playerId: player.id,
          description: flagDescription(player.name),
        });
      }
    }
  }

  return { homeScore, awayScore, matchLog };
}

/**
 * Full game simulation: 18 five-minute ticks, trench-weighted possession.
 * Scores are abstract touchdown counts (cap per team). Pure function (Math.random only).
 */
export function simulateMatch(
  homeTeam: TeamWithSquad,
  awayTeam: TeamWithSquad
): MatchResult {
  const { homeScore, awayScore, matchLog } = runTicks(
    homeTeam,
    awayTeam,
    true
  );
  let winnerId: string | null = null;
  if (homeScore > awayScore) winnerId = homeTeam.id;
  else if (awayScore > homeScore) winnerId = awayTeam.id;
  return { homeScore, awayScore, winnerId, matchLog };
}

/**
 * Same simulation as {@link simulateMatch} without building `matchLog`.
 */
export function simulateQuick(
  homeTeam: TeamWithSquad,
  awayTeam: TeamWithSquad
): QuickMatchResult {
  const { homeScore, awayScore } = runTicks(homeTeam, awayTeam, false);
  let winnerId: string | null = null;
  if (homeScore > awayScore) winnerId = homeTeam.id;
  else if (awayScore > homeScore) winnerId = awayTeam.id;
  return { homeScore, awayScore, winnerId };
}
