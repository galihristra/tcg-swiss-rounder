import type { Player } from '../engine/tournament';

/** The subset of a bracket match this view needs to render a slot. */
export interface BracketMatch {
  id: string;
  p1Id: string | null;
  p2Id: string | null;
  winnerId: string | null;
}

export function nameOf(
  playerMap: Record<string, Player>,
  id: string | null | undefined,
): string {
  if (!id) return '—';
  return playerMap[id]?.name || id;
}
