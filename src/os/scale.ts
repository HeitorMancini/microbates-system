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

/** Pointer position on the flat (unwarped) emulated screen, in UI pixels. */
export function toScreenPoint(clientX: number, clientY: number): { x: number; y: number } {
  const screen = document.querySelector<HTMLElement>(".desktop");
  if (!screen || !screen.offsetWidth) return { x: clientX, y: clientY };
  const rect = screen.getBoundingClientRect();
  // getBoundingClientRect may or may not include the html zoom; derive the factor from it.
  const rectScale = rect.width / screen.offsetWidth;
  const pointerScale = uiScale() / rectScale;
  return {
    x: (clientX / pointerScale - rect.left) / rectScale,
    y: (clientY / pointerScale - rect.top) / rectScale,
  };
}

/** Element bounds on the emulated screen, in UI pixels. */
export function toScreenRect(element: Element): { x: number; y: number; width: number; height: number } {
  const screen = document.querySelector<HTMLElement>(".desktop");
  const box = element.getBoundingClientRect();
  if (!screen || !screen.offsetWidth) return { x: box.left, y: box.top, width: box.width, height: box.height };
  const rect = screen.getBoundingClientRect();
  const k = screen.offsetWidth / rect.width;
  return {
    x: (box.left - rect.left) * k,
    y: (box.top - rect.top) * k,
    width: box.width * k,
    height: box.height * k,
  };
}
