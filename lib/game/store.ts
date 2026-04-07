import { create } from "zustand";
import type { Match, Player, Team, Upgrade } from "@/lib/types";

export type GameState = {
  team: Team | null;
  players: Player[];
  upgrades: Upgrade[];
  recentMatches: Match[];
};

type GameActions = {
  /** Replace hydrated team data from API. */
  setTeam: (_team: Team | null) => void;
  setPlayers: (_players: Player[]) => void;
  setUpgrades: (_upgrades: Upgrade[]) => void;
  addMatchResult: (_match: Match) => void;
  reset: () => void;
};

const initialState: GameState = {
  team: null,
  players: [],
  upgrades: [],
  recentMatches: [],
};

/**
 * Client-side game state. Sync from Supabase / API routes in route handlers or client effects later.
 */
export const useGameStore = create<GameState & GameActions>((set) => ({
  ...initialState,
  setTeam: (team) => set({ team }),
  setPlayers: (players) => set({ players }),
  setUpgrades: (upgrades) => set({ upgrades }),
  addMatchResult: (match) =>
    set((s) => ({ recentMatches: [match, ...s.recentMatches] })),
  reset: () => set(initialState),
}));
