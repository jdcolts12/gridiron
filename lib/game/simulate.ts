import type { Player, Team } from "@/lib/types";

/** Team row plus full squad for power calculations and event attribution. */
export type TeamWithSquad = Team & { players: Player[] };

export type MatchEvent = {
  minute: number;
  type: "goal" | "miss" | "save" | "foul" | "yellow_card";
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
const MAX_GOALS = 7;
const GOAL_ATTEMPT_FOUL_CHANCE = 0.07;
const GOAL_ATTEMPT_YELLOW_CHANCE = 0.035;

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
  midfield: number;
};

function computePowers(
  team: TeamWithSquad,
  side: "home" | "away",
  midWinner: "home" | "away" | "tie"
): Powers {
  const players = team.players;
  const fwd = players.filter((p) => normPos(p) === "FWD");
  const defGk = players.filter((p) => {
    const n = normPos(p);
    return n === "DEF" || n === "GK";
  });
  const mid = players.filter((p) => normPos(p) === "MID");

  const attackBase = avg(fwd.map((p) => p.shooting + p.speed));
  const coachingBonus = 1 + team.coaching_level * 0.05;
  let attack = attackBase * coachingBonus;
  if (
    (midWinner === "home" && side === "home") ||
    (midWinner === "away" && side === "away")
  ) {
    attack *= 1.15;
  }

  const defenseBase = avg(defGk.map((p) => p.strength + p.stamina));
  const stadiumBonus = 1 + team.stadium_level * 0.03;
  const defense = defenseBase * stadiumBonus;

  const midBase = avg(mid.map((p) => p.passing + p.stamina));
  const trainingBonus = 1 + team.training_level * 0.04;
  const midfield = midBase * trainingBonus;

  return { attack, defense, midfield };
}

function midfieldWinner(homeMid: number, awayMid: number): "home" | "away" | "tie" {
  if (homeMid > awayMid) return "home";
  if (awayMid > homeMid) return "away";
  return "tie";
}

/** Even ticks favor home as default aggressor, odd favor away; midfield scales weights. */
function homeAttacksThisTick(
  tickIndex: number,
  homeMid: number,
  awayMid: number
): boolean {
  const ε = 0.01;
  let homeW = homeMid + ε;
  let awayW = awayMid + ε;
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

function pickShooter(attackers: Player[]): Player | undefined {
  const fwd = attackers.filter((p) => normPos(p) === "FWD");
  const mid = attackers.filter((p) => normPos(p) === "MID");
  if (fwd.length && mid.length) {
    return Math.random() < 0.7 ? pickRandom(fwd) : pickRandom(mid);
  }
  return pickRandom(fwd) ?? pickRandom(mid) ?? pickRandom(attackers);
}

function pickDefender(defenders: Player[]): Player | undefined {
  const gk = defenders.filter((p) => normPos(p) === "GK");
  const def = defenders.filter((p) => normPos(p) === "DEF");
  if (gk.length && Math.random() < 0.55) return pickRandom(gk);
  return pickRandom(def) ?? pickRandom(gk) ?? pickRandom(defenders);
}

function pickAny(players: Player[]): Player | undefined {
  return pickRandom(players);
}

function goalDescription(name: string): string {
  const lines = [
    `${name} fires low into the corner — GOAL!`,
    `${name} smashes it past the keeper — GOAL!`,
    `${name} slots home from the edge of the box — GOAL!`,
    `${name} heads in from the cross — GOAL!`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function missDescription(name: string): string {
  const lines = [
    `${name} blazes over from twelve yards.`,
    `${name} drags the shot wide of the post.`,
    `${name} skies it into the stands.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function saveDescription(keeperName: string, shooterName: string): string {
  return `${keeperName} denies ${shooterName} with a sharp save!`;
}

function foulDescription(name: string): string {
  return `${name} goes in late — foul.`;
}

function yellowDescription(name: string): string {
  return `Ref shows yellow to ${name} after a reckless challenge.`;
}

function runTicks(
  homeTeam: TeamWithSquad,
  awayTeam: TeamWithSquad,
  collectLog: boolean
): { homeScore: number; awayScore: number; matchLog: MatchEvent[] } {
  const homePre = computePowers(homeTeam, "home", "tie");
  const awayPre = computePowers(awayTeam, "away", "tie");
  const midWin = midfieldWinner(homePre.midfield, awayPre.midfield);

  const homePow = computePowers(homeTeam, "home", midWin);
  const awayPow = computePowers(awayTeam, "away", midWin);

  let homeScore = 0;
  let awayScore = 0;
  const matchLog: MatchEvent[] = [];

  const push = (e: MatchEvent) => {
    if (collectLog) matchLog.push(e);
  };

  for (let t = 0; t < TICKS; t++) {
    const minute = (t + 1) * 5;
    const homeAttacks = homeAttacksThisTick(t, homePow.midfield, awayPow.midfield);

    const atkTeam = homeAttacks ? homeTeam : awayTeam;
    const defTeam = homeAttacks ? awayTeam : homeTeam;
    const atkPow = homeAttacks ? homePow : awayPow;
    const defPow = homeAttacks ? awayPow : homePow;

    const attTick = atkPow.attack * varianceFactor();
    const defTick = defPow.defense * varianceFactor();
    const denom = attTick + defTick + 1e-6;
    const goalChance = Math.min(0.95, Math.max(0, attTick / denom));

    if (Math.random() < goalChance) {
      const shooter = pickShooter(atkTeam.players);
      const keeperOrDef = pickDefender(defTeam.players);
      if (!shooter) continue;

      const sub = Math.random();
      if (sub < 0.38) {
        const canScore = homeAttacks
          ? homeScore < MAX_GOALS
          : awayScore < MAX_GOALS;
        if (canScore) {
          if (homeAttacks) homeScore += 1;
          else awayScore += 1;
          push({
            minute,
            type: "goal",
            teamId: atkTeam.id,
            playerId: shooter.id,
            description: goalDescription(shooter.name),
          });
        } else {
          const k = keeperOrDef?.name ?? "The keeper";
          push({
            minute,
            type: "save",
            teamId: defTeam.id,
            playerId: keeperOrDef?.id ?? shooter.id,
            description: `${k} holds the line — no eighth goal today.`,
          });
        }
      } else if (sub < 0.7) {
        const k = keeperOrDef ?? pickRandom(defTeam.players);
        if (k) {
          push({
            minute,
            type: "save",
            teamId: defTeam.id,
            playerId: k.id,
            description: saveDescription(k.name, shooter.name),
          });
        }
      } else {
        push({
          minute,
          type: "miss",
          teamId: atkTeam.id,
          playerId: shooter.id,
          description: missDescription(shooter.name),
        });
      }
    }

    if (Math.random() < GOAL_ATTEMPT_FOUL_CHANCE) {
      const foulerTeam = Math.random() < 0.45 ? atkTeam : defTeam;
      const fouler = pickAny(foulerTeam.players);
      if (fouler) {
        push({
          minute,
          type: "foul",
          teamId: foulerTeam.id,
          playerId: fouler.id,
          description: foulDescription(fouler.name),
        });
      }
    }

    if (Math.random() < GOAL_ATTEMPT_YELLOW_CHANCE) {
      const cardTeam = Math.random() < 0.5 ? atkTeam : defTeam;
      const carded = pickAny(cardTeam.players);
      if (carded) {
        push({
          minute,
          type: "yellow_card",
          teamId: cardTeam.id,
          playerId: carded.id,
          description: yellowDescription(carded.name),
        });
      }
    }
  }

  return { homeScore, awayScore, matchLog };
}

/**
 * Full match simulation: 18 five-minute ticks, weighted midfield, goal cap 7 per side.
 * Pure function (uses Math.random only). Each `Team` must be provided with `players`.
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
 * Same simulation as {@link simulateMatch} without building `matchLog` (league / bulk runs).
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
