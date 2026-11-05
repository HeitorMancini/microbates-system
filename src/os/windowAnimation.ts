import { toScreenRect, viewportSize } from "@/os/scale";
import type { Bounds, OsWindow } from "@/os/types";

const DURATION_MS = 220;
const STEPS = 8;
const CAPTION_HEIGHT = 18;

export type WindowTransition = "minimize" | "restore" | "maximize" | "unmaximize";

function caption(bounds: Bounds): Bounds {
  return { x: bounds.x, y: bounds.y, width: bounds.width, height: CAPTION_HEIGHT };
}

function taskbarButton(id: string): Bounds | undefined {
  const button = document.querySelector(`[data-taskbar-id="${CSS.escape(id)}"]`);
  return button ? toScreenRect(button) : undefined;
}

function fullScreen(): Bounds {
  return { x: 0, y: 0, width: viewportSize().width, height: CAPTION_HEIGHT };
}

/** Windows 98's "animate windows": a title-bar-sized rectangle stepping between the two states. */
export function animateWindow(win: OsWindow, transition: WindowTransition) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.querySelector(".popup-layer");
  const button = taskbarButton(win.id);
  if (!layer) return;

  let from: Bounds | undefined;
  let to: Bounds | undefined;
  switch (transition) {
    case "minimize":
      [from, to] = [caption(win), button];
      break;
    case "restore":
      [from, to] = [button, caption(win)];
      break;
    case "maximize":
      [from, to] = [win.mode === "minimized" ? button : caption(win), fullScreen()];
      break;
    case "unmaximize":
      [from, to] = [fullScreen(), caption(win.restoreBounds)];
      break;
  }
  if (!from || !to) return;

  const bar = document.createElement("div");
  bar.className = "window-zoom";
  layer.appendChild(bar);
  const frame = (r: Bounds) => ({
    left: `${r.x}px`,
    top: `${r.y}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  });
  const remove = () => bar.remove();
  bar
    .animate([frame(from), frame(to)], { duration: DURATION_MS, easing: `steps(${STEPS}, end)`, fill: "forwards" })
    .finished.then(remove, remove);
}
