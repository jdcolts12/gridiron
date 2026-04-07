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
    return {
      team_id: teamId,
      name,
      position: slot.position,
      speed: rng(45, 65),
      strength: rng(45, 65),
      passing: rng(45, 65),
      catching: rng(45, 65),
      stamina: rng(50, 70),
      tier: 1,
    };
  });
}
