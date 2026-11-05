"use client";

import { useEffect, useRef } from "react";
import { warpPoint, type WarpCoefficients } from "@/os/crtGeometry";
import { uiScale } from "@/os/scale";

type CursorKind = "arrow" | "hand" | "text" | "nwse";

const svg = (width: number, height: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' shape-rendering='crispEdges'>${body}</svg>`,
  )}")`;

const CURSORS: Record<CursorKind, { image: string; width: number; height: number; x: number; y: number }> = {
  arrow: {
    image: svg(
      12,
      20,
      "<path d='M0.5 0.5v16l4-4 3 7 2-1-3-6.5h5.5z' fill='#fff' stroke='#000'/>",
    ),
    width: 12,
    height: 20,
    x: 0,
    y: 0,
  },
  hand: {
    image: svg(
      16,
      20,
      "<path d='M5.5 0.5h2v7h1v-2h2v2h1v-1h2v2h1v6l-1.5 3.5v2.5h-8v-2.5l-3-4v-3.5h2v1.5h0.5v-9.5z' fill='#fff' stroke='#000'/>",
    ),
    width: 16,
    height: 20,
    x: 6,
    y: 0,
  },
  text: {
    image: svg(
      9,
      17,
      "<path d='M1 0.5h3l0.5 0.5 0.5-0.5h3M4.5 1v15M1 16.5h3l0.5-0.5 0.5 0.5h3' fill='none' stroke='#000'/>",
    ),
    width: 9,
    height: 17,
    x: 4,
    y: 8,
  },
  nwse: {
    image: svg(
      15,
      15,
      "<path d='M0.5 0.5h6l-2 2 8 8 2-2v6h-6l2-2-8-8-2 2z' fill='#fff' stroke='#000'/>",
    ),
    width: 15,
    height: 15,
    x: 7,
    y: 7,
  },
};

const TEXT_INPUT_TYPES = new Set(["", "text", "search", "url", "email", "password", "number", "tel"]);

function cursorFor(target: Element): CursorKind {
  if (target.closest(".os-window__grip")) return "nwse";
  const field = target.closest("input, textarea, [contenteditable='true']");
  if (field instanceof HTMLTextAreaElement && !field.disabled) return "text";
  if (field instanceof HTMLInputElement && !field.disabled && TEXT_INPUT_TYPES.has(field.type)) {
    return "text";
  }
  if (field instanceof HTMLElement && field.isContentEditable) return "text";
  if (target.closest("a[href], [data-cursor='pointer']")) return "hand";
  return "arrow";
}

/**
 * The warp filter only bends pixels; hit-testing stays flat. Hiding the system
 * cursor and drawing one where the real hit point *appears* on the tube keeps
 * every click, drag and text selection native while matching what is seen.
 */
export function CrtCursor({ coefficients }: { coefficients: WarpCoefficients }) {
  const ref = useRef<HTMLDivElement>(null);
  const coefficientsRef = useRef(coefficients);

  useEffect(() => {
    coefficientsRef.current = coefficients;
  }, [coefficients]);

  useEffect(() => {
    const root = document.documentElement;
    const desktop = document.querySelector<HTMLElement>(".desktop");
    const cursor = ref.current;
    if (!desktop || !cursor) return;
    root.dataset.crtCursor = "on";
    let kind: CursorKind | null = null;

    const hide = () => {
      cursor.hidden = true;
    };

    const onMove = (event: PointerEvent) => {
      const target = event.target;
      if (event.pointerType === "touch" || !(target instanceof Element)) return hide();
      if (target.tagName === "IFRAME" || !desktop.contains(target)) return hide();

      const rect = desktop.getBoundingClientRect();
      const width = desktop.offsetWidth;
      const height = desktop.offsetHeight;
      if (!width || !height) return hide();
      // getBoundingClientRect may or may not include the html zoom; derive the factor from it.
      const rectScale = rect.width / width;
      const pointerScale = uiScale() / rectScale;
      const localX = (event.clientX / pointerScale - rect.left) / rectScale;
      const localY = (event.clientY / pointerScale - rect.top) / rectScale;

      const bent = warpPoint((localX / width) * 2 - 1, (localY / height) * 2 - 1, coefficientsRef.current);
      const next = cursorFor(target);
      const sprite = CURSORS[next];
      if (next !== kind) {
        kind = next;
        cursor.style.backgroundImage = sprite.image;
        cursor.style.width = `${sprite.width}px`;
        cursor.style.height = `${sprite.height}px`;
      }
      const x = ((bent.x + 1) / 2) * width - sprite.x;
      const y = ((bent.y + 1) / 2) * height - sprite.y;
      cursor.style.transform = `translate(${x}px, ${y}px)`;
      cursor.hidden = false;
    };

    const onOut = (event: PointerEvent) => {
      const next = event.relatedTarget;
      if (!(next instanceof Element) || next.tagName === "IFRAME" || !desktop.contains(next)) hide();
    };

    window.addEventListener("pointermove", onMove, { capture: true, passive: true });
    window.addEventListener("pointerdown", onMove, { capture: true, passive: true });
    window.addEventListener("pointerout", onOut, { capture: true, passive: true });
    document.documentElement.addEventListener("pointerleave", hide);
    return () => {
      delete root.dataset.crtCursor;
      window.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("pointerdown", onMove, { capture: true });
      window.removeEventListener("pointerout", onOut, { capture: true });
      document.documentElement.removeEventListener("pointerleave", hide);
    };
  }, []);

  return <div ref={ref} className="crt__cursor" hidden aria-hidden="true" />;
}
