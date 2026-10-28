import { placement, type Position } from '../lib/terrain.ts';

export const LEGACY_POSITIONS: Position[] = [
  [0, 0], [5.85, 0], [5.85, 5.85], [0, 5.85],
  [-5.85, 5.85], [-5.85, 0], [-5.85, -5.85], [0, -5.85],
];

export function gardenPositions(count: number, initial: Position[] = []): Position[] {
  const positions = initial.map(p => [...p] as Position);
  while (positions.length < count) positions.push(placement(positions));
  return positions;
}
