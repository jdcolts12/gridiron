import type { Player } from "@/lib/types";

export type ArchetypeInfo = { label: string; emoji: string };

/**
 * Flavor label from position + stat tendencies (display only).
 */
export function playerArchetype(p: Player): ArchetypeInfo {
  const pos = p.position.trim().toUpperCase();

  if (pos === "QB") {
    if (p.speed >= p.passing - 5) return { label: "Mobile QB", emoji: "🏃" };
    return { label: "Pocket QB", emoji: "🎯" };
  }
  if (pos === "RB") {
    if (p.strength >= p.speed) return { label: "Power RB", emoji: "💪" };
    return { label: "Speed RB", emoji: "⚡" };
  }
  if (pos === "WR") {
    if (p.speed >= p.catching + 3) return { label: "Speed WR", emoji: "⚡" };
    return { label: "Possession WR", emoji: "🧤" };
  }
  if (pos === "TE") {
    if (p.strength >= p.catching) return { label: "Blocking TE", emoji: "🧱" };
    return { label: "Receiving TE", emoji: "🎯" };
  }
  if (pos === "OL") return { label: "Mauler", emoji: "🛡️" };
  if (pos === "DL") {
    if (p.strength >= p.speed + 5) return { label: "Run Stopper", emoji: "🧱" };
    return { label: "Pass Rusher", emoji: "💨" };
  }
  if (pos === "LB") {
    if (p.speed >= p.strength) return { label: "Coverage LB", emoji: "🎯" };
    return { label: "Run Stopper LB", emoji: "🧱" };
  }
  if (pos === "DB") {
    if (p.speed >= 58) return { label: "Lockdown Corner", emoji: "🔒" };
    return { label: "Physical DB", emoji: "💪" };
  }
  if (pos === "K") return { label: "Clutch Kicker", emoji: "🦵" };

  return { label: "Athlete", emoji: "🏈" };
}
