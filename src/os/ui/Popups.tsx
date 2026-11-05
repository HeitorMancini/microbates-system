"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { toScreenPoint, viewportSize } from "@/os/scale";
import type { MenuItem } from "./MenuBar";
import { MenuList } from "./PopupMenu";
import styles from "./ui.module.css";

const TOOLTIP_DELAY_MS = 500;
const TOOLTIP_CURSOR_GAP = 20;

type Point = { x: number; y: number };

type TooltipHandlers = {
  onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  onPointerDown: () => void;
};

type PopupsValue = {
  setLayer: (layer: HTMLDivElement | null) => void;
  openContextMenu: (event: { clientX: number; clientY: number; preventDefault: () => void }, items: MenuItem[]) => void;
  /** Native `title` tooltips are drawn by the browser outside the CRT, so these replace them. */
  tooltip: (text: string, shouldShow?: (anchor: HTMLElement) => boolean) => TooltipHandlers;
};

const PopupsContext = createContext<PopupsValue | null>(null);

/** Keeps a popup inside the emulated screen once its size is known. */
function useClampToScreen(ref: RefObject<HTMLElement | null>, point: Point, flipY = 0) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const screen = viewportSize();
    let { x, y } = point;
    if (x + el.offsetWidth > screen.width) x = Math.max(0, screen.width - el.offsetWidth);
    if (y + el.offsetHeight > screen.height) {
      y = flipY ? point.y - flipY - el.offsetHeight - 4 : screen.height - el.offsetHeight;
      y = Math.max(0, y);
    }
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [ref, point, flipY]);
}

function ContextMenu({ point, items, onClose }: { point: Point; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClampToScreen(ref, point);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="popup-layer__item"
      style={{ left: point.x, top: point.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <MenuList items={items} onClose={onClose} />
    </div>
  );
}

function Tooltip({ text, point }: { text: string; point: Point }) {
  const ref = useRef<HTMLDivElement>(null);
  const below = useMemo(() => ({ x: point.x, y: point.y + TOOLTIP_CURSOR_GAP }), [point]);
  useClampToScreen(ref, below, TOOLTIP_CURSOR_GAP);
  return (
    <div ref={ref} className={styles.tooltip} role="tooltip" style={{ left: below.x, top: below.y }}>
      {text}
    </div>
  );
}

export function PopupsProvider({ children }: { children: ReactNode }) {
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<{ point: Point; items: MenuItem[] } | null>(null);
  const [tip, setTip] = useState<{ text: string; point: Point } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const pointer = useRef<Point>({ x: 0, y: 0 });

  const closeContextMenu = useCallback(() => setMenu(null), []);

  const openContextMenu = useCallback<PopupsValue["openContextMenu"]>((event, items) => {
    event.preventDefault();
    window.clearTimeout(timer.current);
    setTip(null);
    setMenu({ point: toScreenPoint(event.clientX, event.clientY), items });
  }, []);

  const hideTooltip = useCallback(() => {
    window.clearTimeout(timer.current);
    setTip(null);
  }, []);

  const tooltip = useCallback<PopupsValue["tooltip"]>(
    (text, shouldShow) => ({
      onPointerEnter: (event) => {
        if (event.pointerType !== "mouse") return;
        const anchor = event.currentTarget;
        pointer.current = toScreenPoint(event.clientX, event.clientY);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          if (!anchor.isConnected || (shouldShow && !shouldShow(anchor))) return;
          setTip({ text, point: pointer.current });
        }, TOOLTIP_DELAY_MS);
      },
      onPointerMove: (event) => {
        pointer.current = toScreenPoint(event.clientX, event.clientY);
      },
      onPointerLeave: hideTooltip,
      onPointerDown: hideTooltip,
    }),
    [hideTooltip],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ setLayer, openContextMenu, tooltip }), [openContextMenu, tooltip]);

  return (
    <PopupsContext.Provider value={value}>
      {children}
      {layer && menu
        ? createPortal(<ContextMenu point={menu.point} items={menu.items} onClose={closeContextMenu} />, layer)
        : null}
      {layer && tip ? createPortal(<Tooltip text={tip.text} point={tip.point} />, layer) : null}
    </PopupsContext.Provider>
  );
}

/** Mount point for menus and tooltips; must sit inside `.desktop-screen` so the CRT filter bends them. */
export function PopupLayer() {
  const { setLayer } = usePopups();
  return <div ref={setLayer} className="popup-layer" />;
}

export function usePopups(): PopupsValue {
  const ctx = useContext(PopupsContext);
  if (!ctx) throw new Error("usePopups must be used within PopupsProvider");
  return ctx;
}
