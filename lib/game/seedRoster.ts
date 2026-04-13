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
  "Parker",
  "Hayden",
  "Micah",
  "Rowan",
  "Logan",
  "Hunter",
  "Shawn",
  "Peyton",
  "Colby",
  "Emery",
  "Nico",
  "Jules",
  "Kendall",
  "Tatum",
  "Skyler",
  "Arden",
  "Remy",
  "Lane",
  "Zion",
  "Noel",
  "Dakota",
  "Kieran",
  "Sage",
  "Rory",
  "Jalen",
  "Milan",
  "Frankie",
  "Briar",
  "Sawyer",
  "Ashton",
  "Cody",
  "Devin",
  "Gavin",
  "Harper",
  "Jesse",
  "Kai",
  "Lennon",
  "Marley",
  "Nolan",
  "Oakley",
  "Presley",
  "River",
  "Spencer",
  "Tristan",
  "Weston",
  "Xavier",
  "Yael",
  "Zane",
  "Adrian",
  "Bennie",
  "Carter",
  "Darian",
  "Elliot",
  "Finley",
  "Greer",
  "Hollis",
  "Indy",
  "Jordy",
  "Keegan",
  "Luca",
  "Maddie",
  "Nia",
  "Omar",
  "Paxton",
  "Reagan",
  "Shiloh",
  "Trey",
  "Uri",
  "Vince",
  "Wren",
  "Yosef",
  "Zuri",
  "Alton",
  "Brady",
  "Camden",
  "Denzel",
  "Elio",
  "Fletcher",
  "Gianni",
  "Hector",
  "Ira",
  "Jonah",
  "Kobe",
  "Leif",
  "Matteo",
  "Nashon",
  "Orion",
  "Pierce",
  "Quade",
  "Rhett",
  "Soren",
  "Thiago",
  "Ulysses",
  "Vaughn",
  "Wallace",
  "Xeno",
  "Yahir",
  "Zephyr",
  "Amari",
  "Brody",
  "Corbin",
  "Darius",
  "Eamon",
  "Forrest",
  "Arlo",
  "Bodhi",
  "Caspian",
  "Dante",
  "Enzo",
  "Felix",
  "Grady",
  "Holden",
  "Iker",
  "Jett",
  "Koa",
  "Lior",
  "Makai",
  "Niko",
  "Onyx",
  "Phoenix",
  "Quinlan",
  "Ronan",
  "Stellan",
  "Tobin",
  "Usher",
  "Vito",
  "Wilder",
  "Xavian",
  "Yuri",
  "Zaire",
  "Ansel",
  "Beau",
  "Caelan",
  "Dax",
  "Elias",
  "Flynn",
  "Gio",
  "Harlan",
  "Isaias",
  "Jasper",
  "Kellan",
  "Lachlan",
  "Malik",
  "Nestor",
  "Odin",
  "Porter",
  "Quinton",
  "Raiden",
  "Sullivan",
  "Teagan",
  "Ulises",
  "Vance",
  "Wyatt",
  "Xim",
  "Yarden",
  "Zeke",
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
  "Bishop",
  "Rivers",
  "Shaw",
  "Bennett",
  "Holland",
  "Foster",
  "Cruz",
  "Baxter",
  "Holloway",
  "Sutton",
  "Phelps",
  "Beck",
  "Maddox",
  "Drake",
  "Carson",
  "Ranger",
  "Mercer",
  "Brennan",
  "Monroe",
  "Ames",
  "Sosa",
  "Palmer",
  "Wilder",
  "Rossi",
  "Townsend",
  "Nash",
  "Gentry",
  "Sinclair",
  "Anders",
  "Bright",
  "Calloway",
  "Dover",
  "Ellison",
  "Farley",
  "Gaines",
  "Huxley",
  "Iverson",
  "Jenkins",
  "Keaton",
  "Langley",
  "Morrison",
  "Norwood",
  "Ortega",
  "Prentice",
  "Quincy",
  "Raines",
  "Sterling",
  "Truitt",
  "Underwood",
  "Valentine",
  "Whitaker",
  "Xanders",
  "York",
  "Zimmer",
  "Ackerman",
  "Bridger",
  "Connelly",
  "Donovan",
  "Easton",
  "Farrow",
  "Gallagher",
  "Hawthorne",
  "Irving",
  "Jamison",
  "Keller",
  "Locke",
  "Marlowe",
  "Neville",
  "Osborne",
  "Pryor",
  "Qualls",
  "Ridley",
  "Sawtell",
  "Templeton",
  "Ulrich",
  "Vasquez",
  "Winslow",
  "Yates",
  "Zeller",
  "Archer",
  "Boyd",
  "Chandler",
  "Dawson",
  "Eldridge",
  "Fitzgerald",
  "Goodwin",
  "Hanley",
  "Ingram",
  "Jarvis",
  "Kincaid",
  "Lowry",
  "McCall",
  "North",
  "Oakman",
  "Prescott",
  "Quick",
  "Rourke",
  "Shepard",
  "Talbot",
  "Upton",
  "Vaughn",
  "Webster",
  "Yeager",
  "Zuniga",
  "Atwood",
  "Boudreaux",
  "Caldwell",
  "Dillard",
  "Ellwood",
  "Fleming",
  "Granger",
  "Holland",
  "Isley",
  "Jacobs",
  "Kramer",
  "Landry",
  "Merritt",
  "Noland",
  "Owens",
  "Patterson",
  "Quinones",
  "Radcliffe",
  "Sampson",
  "Tanner",
  "Ussery",
  "Villarreal",
  "Wooten",
  "Yarbrough",
  "Zamora",
  "Abbott",
  "Barlow",
  "Crosby",
  "Dunlap",
  "Easley",
  "Faber",
  "Guthrie",
  "Hensley",
  "Ivankov",
  "Johnston",
  "Kaufman",
  "Larsen",
  "Mannix",
  "Nieves",
  "Odom",
  "Pruitt",
  "Quigley",
  "Ratliff",
  "Sutter",
  "Trask",
  "Uribe",
  "Varela",
  "Wickham",
  "Yount",
  "Zorn",
  "Aldridge",
  "Blevins",
  "Corbett",
  "Decker",
  "Erickson",
  "Faulkner",
  "Galloway",
  "Hobbs",
  "Ibarra",
  "Jolley",
  "Kessler",
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

function playerOverall(stats: Omit<PlayerInsert, "team_id" | "name" | "position" | "tier">): number {
  return Math.round(
    (stats.speed + stats.strength + stats.passing + stats.catching + stats.stamina) / 5
  );
}

function rosterOverall(players: PlayerInsert[]): number {
  if (players.length === 0) return 0;
  const sum = players.reduce(
    (acc, p) =>
      acc +
      playerOverall({
        speed: p.speed,
        strength: p.strength,
        passing: p.passing,
        catching: p.catching,
        stamina: p.stamina,
      }),
    0
  );
  return Math.round(sum / players.length);
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
 * Names are sampled randomly to avoid clone rosters for new teams.
 */
export function buildStarterPlayers(teamId: string, existingNames?: Iterable<string>): PlayerInsert[] {
  const used = new Set<string>(existingNames ?? []);

  const players: PlayerInsert[] = SLOTS.map((slot, i) => {
    let name = "";
    for (let t = 0; t < 50; t++) {
      const fn = FIRST[rng(0, FIRST.length - 1)];
      const ln = LAST[rng(0, LAST.length - 1)];
      const candidate = `${fn} ${ln}`;
      if (!used.has(candidate)) {
        name = candidate;
        used.add(candidate);
        break;
      }
    }
    if (!name) {
      const fallback = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]} #${rng(10, 99)}`;
      name = fallback;
      used.add(fallback);
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

  // Keep new teams competitively close (54-58 OVR) with slight variance.
  const targetTeamOvr = rng(54, 58);
  let delta = targetTeamOvr - rosterOverall(players);
  let attempts = 0;
  while (delta !== 0 && attempts < 8) {
    for (const p of players) {
      const step = delta > 0 ? 1 : -1;
      p.speed = clampStat(p.speed + step);
      p.strength = clampStat(p.strength + step);
      p.passing = clampStat(p.passing + step);
      p.catching = clampStat(p.catching + step);
      p.stamina = clampStat(p.stamina + step);
    }
    delta = targetTeamOvr - rosterOverall(players);
    attempts++;
  }

  return players;
}
