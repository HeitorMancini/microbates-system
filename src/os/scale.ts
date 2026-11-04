export function uiScale(): number {
  if (typeof window === "undefined") return 1;
  return parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
}

/** Size of the emulated screen (inside the monitor frame), in UI pixels. */
export function viewportSize(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 1024, height: 768 };
  const screen = document.querySelector<HTMLElement>(".desktop");
  if (screen) return { width: screen.clientWidth, height: screen.clientHeight };
  const scale = uiScale();
  return { width: window.innerWidth / scale, height: window.innerHeight / scale };
}
