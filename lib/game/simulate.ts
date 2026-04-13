import { FACILITY_BONUS_RATE } from "@/lib/game/facilityBonuses";
import { clampStadiumLevel } from "@/lib/game/stadium";
import type { Player, Team } from "@/lib/types";

/** Team row plus full squad for power calculations and event attribution. */
export type TeamWithSquad = Team & { players: Player[] };

/** Football replay events (stored in `match_log` jsonb). */
export type MatchEvent = {
  /** Legacy abstract minute (5 per tick); kept for older logs. */
  minute: number;
  quarter: number;
  /** Game clock string, e.g. 3:42 (counts down within quarter). */
  clock: string;
  type:
    | "touchdown"
    | "incomplete"
    | "pass_breakup"
    | "penalty"
    | "flag"
    | "kickoff"
    | "quarter_break"
    | "sack"
    | "interception"
    | "run_gain"
    | "run_stuffed"
    | "short_pass"
    | "momentum_note"
    | "play_of_game";
  teamId: string;
  playerId: string;
  description: string;
  /** Present on scoring / quarter / kickoff lines when a score snapshot is shown. */
  homeScore?: number;
  awayScore?: number;
  bigPlay?: boolean;
  yards?: number;
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
const MAX_TOUCHDOWNS_PER_TEAM = 7;
const PENALTY_ROLL = 0.07;
const FLAG_ROLL = 0.035;

/** Q1: ticks 0–4, Q2: 5–9, Q3: 10–14, Q4: 15–17 */
function tickQuarter(tick: number): 1 | 2 | 3 | 4 {
  if (tick < 5) return 1;
  if (tick < 10) return 2;
  if (tick < 15) return 3;
  return 4;
}

function tickClock(tick: number): string {
  const q = tickQuarter(tick);
  const start = [0, 5, 10, 15][q - 1];
  const playsInQ = q === 4 ? 3 : 5;
  const i = tick - start;
  const totalSec = 15 * 60;
  const step = totalSec / (playsInQ + 1);
  const jitter = (tick * 37 + q * 11) % 48;
  const sec = Math.max(
    8,
    Math.round(totalSec - (i + 1) * step - jitter)
  );
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

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

function rndYards(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type Powers = {
  attack: number;
  defense: number;
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
  return normPos(p) === "OL";
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

function pickQb(attackers: Player[]): Player | undefined {
  return pickRandom(attackers.filter((p) => normPos(p) === "QB"));
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

function pickRb(attackers: Player[]): Player | undefined {
  return pickRandom(attackers.filter((p) => normPos(p) === "RB"));
}

function tdPassDeep(qb: string, rec: string, yards: number): string {
  const lines = [
    `${qb} launches deep — ${rec} runs under it… TOUCHDOWN! 🔥`,
    `${rec} blows the top off the D — ${qb} drops it in the bucket. SIX! 🔥`,
    `${yards} yards through the air — ${rec} walks in! Touchdown! 🔥`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function tdScreen(qb: string, rec: string): string {
  const lines = [
    `Screen! ${rec} follows convoy and dives in — TOUCHDOWN! 🔥`,
    `${qb} flips it out — ${rec} weaves through traffic — six! 🔥`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function tdRun(name: string, yards: number): string {
  const lines = [
    `${name} takes the handoff… breaks free down the sideline — TOUCHDOWN! 🔥`,
    `${name} runs up the gut and won’t be denied — six! 🔥`,
    `${yards}-yard burst — ${name} crosses the stripe! TOUCHDOWN! 🔥`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function incompletePressure(qb: string): string {
  const lines = [
    `Big pressure! ${qb} throws it away.`,
    `${qb} can’t set his feet — sails one incomplete.`,
    `${qb} fires late — too high, incomplete.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function incompleteNearInt(qb: string, db: string): string {
  return `${db} nearly picks it — ${qb} lucky it’s incomplete!`;
}

function breakupLine(defName: string, offName: string): string {
  const lines = [
    `${defName} breaks up the pass intended for ${offName}.`,
    `${defName} swats it away — ${offName} had a step.`,
    `Pass breakup! ${defName} on ${offName}.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function sackLine(defName: string, qbName: string): string {
  const lines = [
    `SACK! ${defName} crushes the pocket — ${qbName} goes down!`,
    `${defName} comes free — ${qbName} eaten in the backfield!`,
    `Huge hit in the backfield — sack ${defName} on ${qbName}!`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function intLine(defName: string, qbName: string): string {
  const lines = [
    `INTERCEPTION! ${defName} jumps the route — ${qbName} never saw him!`,
    `${defName} undercuts it — picked! The crowd erupts!`,
    `Ball’s loose… no — ${defName} hauls it in! Interception!`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function runGainLine(name: string, y: number): string {
  const lines = [
    `${name} finds a lane — ${y}-yard gain!`,
    `${name} bounces outside for a solid ${y}-yard pickup.`,
    `Chunk play! ${name} for ${y}.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function runStuffedLine(name: string, defName: string): string {
  const lines = [
    `${name} met at the line — ${defName} stuffs the run!`,
    `Nowhere to go — ${defName} swallows ${name} in the hole.`,
    `${name} up the middle… stacked up by ${defName}.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function shortPassLine(qb: string, rec: string, y: number): string {
  return `${qb} quick out to ${rec} — ${y} yards and a first down look.`;
}

function penaltyLine(name: string): string {
  const lines = [
    `Flag on the play — holding on ${name}.`,
    `Yellow laundry — ${name} called for holding.`,
    `Penalty: ${name} — holding.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function flagPersonal(name: string): string {
  const lines = [
    `${name} flagged for a personal foul.`,
    `Late hit — flag on ${name}.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function fumbleLine(defName: string, offName: string): string {
  const lines = [
    `FUMBLE! ${defName} punches it out — ${offName} loses the rock!`,
    `Ball’s on the turf! ${defName} separates ${offName} from the football!`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function bigHitLine(defName: string, offName: string): string {
  return `BIG HIT — ${defName} lights up ${offName}!`;
}

function quarterOrdinal(q: number): string {
  if (q === 1) return "1st";
  if (q === 2) return "2nd";
  if (q === 3) return "3rd";
  return "4th";
}

function appendEvent(
  log: MatchEvent[],
  tick: number,
  e: Omit<MatchEvent, "minute" | "quarter" | "clock">
): void {
  log.push({
    minute: (tick + 1) * 5,
    quarter: tickQuarter(tick),
    clock: tickClock(tick),
    ...e,
  });
}

function maybeMomentumNote(
  log: MatchEvent[],
  tick: number,
  momentum: number,
  homeTeam: TeamWithSquad
): void {
  if (Math.abs(momentum) < 2 || Math.random() > 0.38) return;
  const pct = Math.min(15, Math.abs(momentum) * 5);
  const side = momentum > 0 ? "HOME" : "AWAY";
  appendEvent(log, tick, {
    type: "momentum_note",
    teamId: homeTeam.id,
    playerId: homeTeam.id,
    description: `🔥 Momentum: ${side} (+${pct}%)`,
  });
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
  let momentum = 0;
  type Potg = { score: number; description: string; playerName: string };
  const potgBest: { current: Potg | null } = { current: null };

  const recordPotg = (
    score: number,
    description: string,
    playerName: string
  ) => {
    const cur = potgBest.current;
    if (!cur || score > cur.score) {
      potgBest.current = { score, description, playerName };
    }
  };

  const push = (tick: number, e: Omit<MatchEvent, "minute" | "quarter" | "clock">) => {
    if (collectLog) appendEvent(matchLog, tick, e);
  };

  if (collectLog) {
    matchLog.push({
      minute: 0,
      quarter: 1,
      clock: "12:00",
      type: "kickoff",
      teamId: homeTeam.id,
      playerId: homeTeam.id,
      description: "Kickoff — we're underway! 🏈",
      homeScore: 0,
      awayScore: 0,
    });
  }

  for (let t = 0; t < TICKS; t++) {
    const homePossession = homeHasPossessionThisTick(
      t,
      homePow.trench,
      awayPow.trench
    );

    const atkTeam = homePossession ? homeTeam : awayTeam;
    const defTeam = homePossession ? awayTeam : homeTeam;
    const atkPow = homePossession ? homePow : awayPow;
    const defPow = homePossession ? awayPow : homePow;

    const sideSign = homePossession ? 1 : -1;

    const attTick = atkPow.attack * varianceFactor();
    const defTick = defPow.defense * varianceFactor();
    const denom = attTick + defTick + 1e-6;
    let scoreChance = Math.min(0.92, Math.max(0.06, attTick / denom));
    scoreChance *= 1 + momentum * sideSign * 0.015;
    scoreChance = Math.min(0.93, Math.max(0.05, scoreChance));

    if (Math.random() < scoreChance) {
      const ballCarrier = pickSkillPlayer(atkTeam.players);
      const defender = pickDefender(defTeam.players);
      const qb = pickQb(atkTeam.players) ?? ballCarrier;

      if (!ballCarrier) continue;

      const roll = Math.random();

      if (roll < 0.34) {
        const canScore = homePossession
          ? homeScore < MAX_TOUCHDOWNS_PER_TEAM
          : awayScore < MAX_TOUCHDOWNS_PER_TEAM;
        if (canScore) {
          const bigPlay = Math.random() < 0.22;
          const yards = bigPlay ? rndYards(38, 62) : rndYards(6, 22);
          let desc: string;
          const wrTe =
            normPos(ballCarrier) !== "QB" ? ballCarrier : pickSkillPlayer(atkTeam.players.filter((p) => p.id !== ballCarrier.id)) ?? ballCarrier;
          const qbName = qb?.name ?? "The QB";
          const mode = Math.random();

          if (normPos(ballCarrier) === "RB" && mode < 0.42) {
            desc = tdRun(ballCarrier.name, yards);
          } else if (mode < 0.55) {
            desc = tdPassDeep(qbName, wrTe.name, yards);
          } else if (mode < 0.78) {
            desc = tdScreen(qbName, wrTe.name);
          } else {
            desc = tdRun(
              pickRb(atkTeam.players)?.name ?? wrTe.name,
              yards
            );
          }

          if (bigPlay) {
            desc = `🔥 BIG PLAY — ${yards} yards! ${desc}`;
          }

          if (homePossession) homeScore += 1;
          else awayScore += 1;

          momentum += sideSign * (bigPlay ? 2 : 1);
          momentum = Math.max(-4, Math.min(4, momentum));

          recordPotg(
            100 + yards + (bigPlay ? 40 : 0),
            desc.replace(/🔥 BIG PLAY[^!]*! /, ""),
            ballCarrier.name
          );

          push(t, {
            type: "touchdown",
            teamId: atkTeam.id,
            playerId: ballCarrier.id,
            description: desc,
            homeScore,
            awayScore,
            bigPlay,
            yards,
          });
        } else {
          const d = defender?.name ?? "The defense";
          push(t, {
            type: "pass_breakup",
            teamId: defTeam.id,
            playerId: defender?.id ?? ballCarrier.id,
            description: `${d} stands tall — goal line stand! No score.`,
          });
        }
      } else if (roll < 0.42) {
        const dl = pickDefender(defTeam.players);
        if (qb && dl) {
          momentum -= sideSign * 1;
          momentum = Math.max(-4, Math.min(4, momentum));
          push(t, {
            type: "sack",
            teamId: defTeam.id,
            playerId: dl.id,
            description: sackLine(dl.name, qb.name),
          });
        }
      } else if (roll < 0.52) {
        const db = defender ?? pickRandom(defTeam.players);
        if (qb && db && Math.random() < 0.55) {
          momentum -= sideSign * 2;
          momentum = Math.max(-4, Math.min(4, momentum));
          recordPotg(75, intLine(db.name, qb.name), db.name);
          push(t, {
            type: "interception",
            teamId: defTeam.id,
            playerId: db.id,
            description: intLine(db.name, qb.name),
          });
        } else if (db) {
          push(t, {
            type: "incomplete",
            teamId: atkTeam.id,
            playerId: qb?.id ?? ballCarrier.id,
            description: incompleteNearInt(qb?.name ?? "The QB", db.name),
          });
        }
      } else if (roll < 0.68) {
        const d = defender ?? pickRandom(defTeam.players);
        if (d) {
          push(t, {
            type: "pass_breakup",
            teamId: defTeam.id,
            playerId: d.id,
            description: breakupLine(d.name, ballCarrier.name),
          });
        }
      } else if (roll < 0.8) {
        push(t, {
          type: "incomplete",
          teamId: atkTeam.id,
          playerId: qb?.id ?? ballCarrier.id,
          description: incompletePressure(qb?.name ?? ballCarrier.name),
        });
      } else if (roll < 0.9) {
        const rb = pickRb(atkTeam.players) ?? ballCarrier;
        const y = rndYards(4, 14);
        push(t, {
          type: "run_gain",
          teamId: atkTeam.id,
          playerId: rb.id,
          description: runGainLine(rb.name, y),
          yards: y,
        });
      } else {
        const rb = pickRb(atkTeam.players) ?? ballCarrier;
        const d = defender ?? pickAny(defTeam.players);
        if (d) {
          push(t, {
            type: "run_stuffed",
            teamId: defTeam.id,
            playerId: d.id,
            description: runStuffedLine(rb.name, d.name),
          });
        }
      }
    } else {
      const defPlay = Math.random();
      const qb = pickQb(atkTeam.players);
      const defP = pickDefender(defTeam.players);
      const skill = pickSkillPlayer(atkTeam.players);

      if (defPlay < 0.28 && qb && defP) {
        const spY = rndYards(5, 12);
        push(t, {
          type: "short_pass",
          teamId: atkTeam.id,
          playerId: qb.id,
          description: shortPassLine(
            qb.name,
            skill?.name ?? "the receiver",
            spY
          ),
          yards: spY,
        });
      } else if (defPlay < 0.42 && skill && defP && Math.random() < 0.35) {
        push(t, {
          type: "pass_breakup",
          teamId: defTeam.id,
          playerId: defP.id,
          description: bigHitLine(defP.name, skill.name),
        });
      } else if (defPlay < 0.52 && skill && defP && Math.random() < 0.25) {
        push(t, {
          type: "pass_breakup",
          teamId: defTeam.id,
          playerId: defP.id,
          description: fumbleLine(defP.name, skill.name),
        });
      } else if (defPlay < 0.72) {
        const rb = pickRb(atkTeam.players) ?? skill;
        const d = defP ?? pickAny(defTeam.players);
        if (rb && d) {
          const y = rndYards(2, 9);
          push(t, {
            type: "run_gain",
            teamId: atkTeam.id,
            playerId: rb.id,
            description: runGainLine(rb.name, y),
            yards: y,
          });
        }
      } else {
        const rb = pickRb(atkTeam.players) ?? skill;
        const d = defP ?? pickAny(defTeam.players);
        if (rb && d) {
          push(t, {
            type: "run_stuffed",
            teamId: defTeam.id,
            playerId: d.id,
            description: runStuffedLine(rb.name, d.name),
          });
        }
      }
    }

    if (Math.random() < PENALTY_ROLL) {
      const side = Math.random() < 0.45 ? atkTeam : defTeam;
      const player = pickAny(side.players);
      if (player) {
        push(t, {
          type: "penalty",
          teamId: side.id,
          playerId: player.id,
          description: penaltyLine(player.name),
        });
      }
    }

    if (Math.random() < FLAG_ROLL) {
      const side = Math.random() < 0.5 ? atkTeam : defTeam;
      const player = pickAny(side.players);
      if (player) {
        push(t, {
          type: "flag",
          teamId: side.id,
          playerId: player.id,
          description: flagPersonal(player.name),
        });
      }
    }

    if (collectLog) {
      maybeMomentumNote(matchLog, t, momentum, homeTeam);
    }

    if (collectLog && (t === 4 || t === 9 || t === 14)) {
      const q = tickQuarter(t);
      const ord = quarterOrdinal(q);
      const halftime = q === 2 ? " — Halftime" : "";
      appendEvent(matchLog, t, {
        type: "quarter_break",
        teamId: homeTeam.id,
        playerId: homeTeam.id,
        description: `--- End of ${ord} Quarter${halftime} ---`,
        homeScore,
        awayScore,
      });
    }
  }

  if (collectLog && potgBest.current) {
    const h = potgBest.current;
    matchLog.push({
      minute: 95,
      quarter: 4,
      clock: "0:00",
      type: "play_of_game",
      teamId: homeTeam.id,
      playerId: homeTeam.id,
      description: `⭐ Play of the Game — ${h.playerName}: ${h.description}`,
    });
  }

  return { homeScore, awayScore, matchLog };
}

/**
 * Full game simulation: 18 ticks across 4 quarters, broadcast-style log.
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
