/** Deterministic per-identity visuals, generated entirely on-device.
 *
 * Each identity gets a random-looking monochrome "icon" — a symmetric glyph
 * grid seeded from the identity's own seed (a random value created at signup).
 * Variety comes from the glyph, aura angle and intensity — never colour, so the
 * palette stays strictly black & white. */

import { initialsFor } from './format';

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tiny deterministic PRNG (mulberry32) so the same seed always draws the same glyph. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Monochrome aura intensities (%). */
const INTENSITIES = [16, 26, 12, 22, 32, 14];

export interface AvatarVisual {
  /** 0–360° rotation of the identity's aura. */
  rotation: number;
  /** Aura intensity (%) — keeps identities distinguishable without colour. */
  intensity: number;
  /** Monogram fallback for the smallest sizes. */
  initials: string;
  /** 5×5 glyph grid, mirrored left/right — always at least one lit cell. */
  cells: boolean[];
  /** Corner rounding of the glyph cells. */
  cellRadius: number;
  /** Whether the glyph sits inside a thin ring. */
  ring: boolean;
}

export function avatarVisual(seed: string): AvatarVisual {
  const key = seed || 'knot';
  const h = hashString(key);
  const rnd = mulberry32(h);

  const cells: boolean[] = new Array(25).fill(false);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const on = rnd() > 0.44;
      cells[row * 5 + col] = on;
      cells[row * 5 + (4 - col)] = on;
    }
  }
  if (!cells.some(Boolean)) cells[12] = true;

  return {
    rotation: h % 360,
    intensity: INTENSITIES[h % INTENSITIES.length],
    initials: initialsFor(key),
    cells,
    cellRadius: h % 3 === 0 ? 0.42 : 0.18,
    ring: rnd() > 0.62
  };
}
