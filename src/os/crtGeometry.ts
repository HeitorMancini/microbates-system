/** Visible area of a 15" 4:3 CRT and a typical desk viewing distance. */
const SCREEN_WIDTH_MM = 280;
const SCREEN_HEIGHT_MM = 210;
const VIEW_DISTANCE_MM = 500;

export const TUBE_RADIUS_MIN_MM = 1000;
export const TUBE_RADIUS_MAX_MM = 5000;

export type WarpCoefficients = {
  /** Vertical compression at the left/right edges (bends horizontal lines). */
  horizontal: number;
  /** Horizontal compression at the top/bottom edges (bends vertical lines). */
  vertical: number;
};

/**
 * A spherical faceplate of radius R recedes by d ≈ r² / 2R at distance r from
 * the centre; seen from distance D, perspective shrinks that point by D / (D + d),
 * i.e. ≈ 1 - r² / 2RD. Evaluated at the half-width and half-height of the tube.
 */
export function warpCoefficients(radiusMm: number): WarpCoefficients {
  const k = 1 / (2 * radiusMm * VIEW_DISTANCE_MM);
  return {
    horizontal: (SCREEN_WIDTH_MM / 2) ** 2 * k,
    vertical: (SCREEN_HEIGHT_MM / 2) ** 2 * k,
  };
}

/**
 * Where a point of the flat UI appears on the curved tube, in normalised
 * coordinates (-1..1 from the centre). Solves the model used by the warp map,
 * screenY = y * (1 - h * screenX²) and screenX = x * (1 - v * screenY²);
 * the coefficients are tiny, so a few fixed-point steps converge.
 */
export function warpPoint(
  x: number,
  y: number,
  { horizontal, vertical }: WarpCoefficients,
): { x: number; y: number } {
  let sx = x;
  let sy = y;
  for (let i = 0; i < 4; i++) {
    sx = x * (1 - vertical * sy * sy);
    sy = y * (1 - horizontal * sx * sx);
  }
  return { x: sx, y: sy };
}

/** 0 for the flattest tube in range, 1 for the most curved. */
export function curvedness(radiusMm: number): number {
  return (TUBE_RADIUS_MAX_MM - radiusMm) / (TUBE_RADIUS_MAX_MM - TUBE_RADIUS_MIN_MM);
}
