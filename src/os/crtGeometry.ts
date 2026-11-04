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

/** 0 for the flattest tube in range, 1 for the most curved. */
export function curvedness(radiusMm: number): number {
  return (TUBE_RADIUS_MAX_MM - radiusMm) / (TUBE_RADIUS_MAX_MM - TUBE_RADIUS_MIN_MM);
}
