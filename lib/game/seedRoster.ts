/** Starter roster for a new franchise (15 players). */

const FIRST = [
  "Alex",
  "Jordan",
  "Sam",
  "Riley",
  "Casey",
  "Morgan",
  "Quinn",
  "Jamie",
  "Taylor",
  "Reese",
  "Avery",
  "Blake",
  "Cameron",
  "Drew",
  "Ellis",
];
const LAST = [
  "Reed",
  "Hayes",
  "Brooks",
  "Cole",
  "Vaughn",
  "Pierce",
  "Dalton",
  "Graves",
  "Knox",
  "Marsh",
  "Finch",
  "Stone",
  "Cross",
  "Wells",
  "Blake",
];

export type PlayerInsert = {
  team_id: string;
  name: string;
  position: string;
  speed: number;
  strength: number;
  passing: number;
  catching: number;
  stamina: number;
  tier: number;
};

/** One QB, skill positions, OL/DL/LB/DB — 15 total. */
const SLOTS: { position: string }[] = [
  { position: "QB" },
  { position: "RB" },
  { position: "RB" },
  { position: "WR" },
  { position: "WR" },
  { position: "WR" },
  { position: "TE" },
  { position: "OL" },
  { position: "OL" },
  { position: "DL" },
  { position: "DL" },
  { position: "LB" },
  { position: "LB" },
  { position: "DB" },
  { position: "DB" },
];

function rng(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampStat(v: number): number {
  return Math.max(40, Math.min(72, v));
}

function buildPositionStats(position: string) {
  const base = {
    speed: rng(48, 62),
    strength: rng(48, 62),
    passing: rng(48, 62),
    catching: rng(48, 62),
    stamina: rng(52, 68),
  };

  const p = position.toUpperCase();
  if (p === "QB") {
    base.passing += 8;
    base.strength += 3;
    base.catching -= 4;
  } else if (p === "RB") {
    base.speed += 5;
    base.strength += 4;
    base.passing -= 4;
  } else if (p === "WR") {
    base.speed += 6;
    base.catching += 7;
    base.strength -= 2;
  } else if (p === "TE") {
    base.strength += 6;
    base.catching += 4;
    base.speed -= 1;
  } else if (p === "OL") {
    base.strength += 9;
    base.passing += 2;
    base.speed -= 6;
    base.catching -= 4;
  } else if (p === "DL") {
    base.strength += 8;
    base.speed += 2;
    base.catching -= 3;
  } else if (p === "LB") {
    base.strength += 5;
    base.speed += 4;
    base.passing += 2;
  } else if (p === "DB") {
    base.speed += 7;
    base.passing += 4;
    base.catching += 4;
    base.strength -= 2;
  }

  return {
    speed: clampStat(base.speed),
    strength: clampStat(base.strength),
    passing: clampStat(base.passing),
    catching: clampStat(base.catching),
    stamina: clampStat(base.stamina),
  };
}

/**
 * Builds insert rows for `public.players` (no ids — DB default).
 */
export function buildStarterPlayers(teamId: string): PlayerInsert[] {
  const used = new Set<string>();
  return SLOTS.map((slot, i) => {
    let name = "";
    for (let t = 0; t < 5; t++) {
      const fn = FIRST[(i + t) % FIRST.length];
      const ln = LAST[(i * 3 + t) % LAST.length];
      name = `${fn} ${ln}`;
      if (!used.has(name)) {
        used.add(name);
        break;
      }
    }
    const stats = buildPositionStats(slot.position);
    return {
      team_id: teamId,
      name,
      position: slot.position,
      speed: stats.speed,
      strength: stats.strength,
      passing: stats.passing,
      catching: stats.catching,
      stamina: stats.stamina,
      tier: 1,
    };
  });
}
