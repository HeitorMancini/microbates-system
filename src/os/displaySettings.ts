"use client";

import { useSyncExternalStore } from "react";

export type DisplaySettings = {
  enabled: boolean;
  /** Faceplate radius of curvature in millimetres. */
  tubeRadius: number;
  warp: boolean;
  vignette: boolean;
  vignetteIntensity: number;
  reflection: boolean;
  reflectionIntensity: number;
  scanlines: boolean;
  scanlinesIntensity: number;
  scanlinesScroll: boolean;
  rgb: boolean;
  rgbIntensity: number;
  noise: boolean;
  noiseIntensity: number;
  flicker: boolean;
  flickerIntensity: number;
  band: boolean;
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  enabled: true,
  tubeRadius: 2000,
  warp: true,
  vignette: true,
  vignetteIntensity: 40,
  reflection: true,
  reflectionIntensity: 35,
  scanlines: true,
  scanlinesIntensity: 45,
  scanlinesScroll: true,
  rgb: true,
  rgbIntensity: 25,
  noise: true,
  noiseIntensity: 35,
  flicker: true,
  flickerIntensity: 50,
  band: true,
};

const STORAGE_KEY = "hesmos:display";
const listeners = new Set<() => void>();
let current = DEFAULT_DISPLAY_SETTINGS;
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) current = { ...DEFAULT_DISPLAY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    current = DEFAULT_DISPLAY_SETTINGS;
  }
}

export function getDisplaySettings(): DisplaySettings {
  load();
  return current;
}

export function setDisplaySettings(patch: Partial<DisplaySettings>) {
  load();
  current = { ...current, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage can be unavailable (private mode); settings still apply for this session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDisplaySettings(): DisplaySettings {
  return useSyncExternalStore(subscribe, getDisplaySettings, () => DEFAULT_DISPLAY_SETTINGS);
}
