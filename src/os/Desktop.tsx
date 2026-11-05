"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { getApp } from "@/apps/registry";
import { DESKTOP_SHORTCUTS } from "@/content/content";
import type { DesktopShortcut } from "@/content/types";
import { getNode, iconForNode, kindLabel } from "@/content/vfs";
import { toScreenPoint } from "@/os/scale";
import { usePopups } from "@/os/ui";
import { useWindowManager } from "@/os/WindowManager";

type Arrange = "name" | "type" | null;
type Rect = { x: number; y: number; width: number; height: number };

const REFRESH_MS = 120;
const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

function shortcutIcon(shortcut: DesktopShortcut): string {
  if (shortcut.icon) return shortcut.icon;
  if ("appId" in shortcut.target) return getApp(shortcut.target.appId)?.icon ?? "";
  const node = getNode(shortcut.target.fileId);
  return node ? iconForNode(node) : "";
}

function typeKey(shortcut: DesktopShortcut): string {
  if ("appId" in shortcut.target) return `0${shortcut.label}`;
  const node = getNode(shortcut.target.fileId);
  return `1${node ? kindLabel(node) : ""}${shortcut.label}`;
}

function arranged(arrange: Arrange): DesktopShortcut[] {
  if (!arrange) return DESKTOP_SHORTCUTS;
  const key = arrange === "name" ? (shortcut: DesktopShortcut) => shortcut.label : typeKey;
  return [...DESKTOP_SHORTCUTS].sort((a, b) => key(a).localeCompare(key(b), "pt-BR"));
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function sameSelection(current: ReadonlySet<string>, next: string[]): boolean {
  return current.size === next.length && next.every((label) => current.has(label));
}

/** Closest icon in the arrow's direction, so navigation follows the column-wrapped layout. */
function neighbour(icons: HTMLElement[], from: HTMLElement, key: string): HTMLElement | undefined {
  const dx = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
  const dy = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
  let best: HTMLElement | undefined;
  let bestScore = Infinity;
  for (const icon of icons) {
    const ox = icon.offsetLeft - from.offsetLeft;
    const oy = icon.offsetTop - from.offsetTop;
    const along = ox * dx + oy * dy;
    if (icon === from || along <= 0) continue;
    const score = along + Math.abs(dx ? oy : ox) * 4;
    if (score < bestScore) {
      best = icon;
      bestScore = score;
    }
  }
  return best;
}

export function DesktopSurface({ children }: { children: ReactNode }) {
  const { openApp, openFile, setStartMenuOpen } = useWindowManager();
  const { openContextMenu } = usePopups();
  const [arrange, setArrange] = useState<Arrange>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const iconsRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
  const shortcuts = arranged(arrange);

  const launch = (shortcut: DesktopShortcut) => {
    if ("appId" in shortcut.target) openApp(shortcut.target.appId);
    else openFile(shortcut.target.fileId);
  };

  const isBackground = (event: { target: EventTarget; currentTarget: EventTarget }) =>
    event.target === event.currentTarget || event.target === iconsRef.current;

  const iconElements = () =>
    Array.from(iconsRef.current?.querySelectorAll<HTMLElement>("[data-label]") ?? []);

  const onSurfacePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isBackground(event)) return;
    setStartMenuOpen(false);
    setSelected(new Set());
    if (event.button !== 0 || event.pointerType !== "mouse") return;
    marqueeStart.current = toScreenPoint(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onSurfacePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = marqueeStart.current;
    const box = marqueeRef.current;
    const icons = iconsRef.current;
    if (!start || !box || !icons) return;
    const point = toScreenPoint(event.clientX, event.clientY);
    const rect: Rect = {
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    };
    box.style.display = "block";
    box.style.left = `${rect.x}px`;
    box.style.top = `${rect.y}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    const hits = iconElements()
      .filter((icon) =>
        intersects(rect, {
          x: icons.offsetLeft + icon.offsetLeft,
          y: icons.offsetTop + icon.offsetTop,
          width: icon.offsetWidth,
          height: icon.offsetHeight,
        }),
      )
      .map((icon) => icon.dataset.label ?? "");
    setSelected((current) => (sameSelection(current, hits) ? current : new Set(hits)));
  };

  const onSurfacePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    marqueeStart.current = null;
    if (marqueeRef.current) marqueeRef.current.style.display = "none";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onSurfaceContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!isBackground(event)) return;
    openContextMenu(event, [
      {
        label: "Organizar ícones",
        items: [
          { label: "Por nome", onSelect: () => setArrange("name") },
          { label: "Por tipo", onSelect: () => setArrange("type") },
        ],
      },
      {
        label: "Atualizar",
        onSelect: () => {
          setRefreshing(true);
          window.setTimeout(() => setRefreshing(false), REFRESH_MS);
        },
      },
      "separator",
      { label: "Propriedades", onSelect: () => openApp("control-panel") },
    ]);
  };

  const onIconKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      shortcuts.filter((shortcut) => selected.has(shortcut.label)).forEach(launch);
      return;
    }
    if (!ARROWS.has(event.key)) return;
    event.preventDefault();
    const next = neighbour(iconElements(), event.currentTarget, event.key);
    if (!next) return;
    next.focus();
    setSelected(new Set([next.dataset.label ?? ""]));
  };

  return (
    <div
      className="desktop-surface"
      onPointerDown={onSurfacePointerDown}
      onPointerMove={onSurfacePointerMove}
      onPointerUp={onSurfacePointerUp}
      onPointerCancel={onSurfacePointerUp}
      onContextMenu={onSurfaceContextMenu}
    >
      <div
        ref={iconsRef}
        className="desktop-icons"
        role="listbox"
        aria-label="Área de trabalho"
        aria-multiselectable="true"
        style={refreshing ? { visibility: "hidden" } : undefined}
      >
        {shortcuts.map((shortcut) => {
          const isSelected = selected.has(shortcut.label);
          const target = shortcut.target;
          const icon = shortcutIcon(shortcut);
          return (
            <button
              key={shortcut.label}
              type="button"
              className={`desktop-icon${isSelected ? " desktop-icon--selected" : ""}`}
              role="option"
              aria-label={`Abrir ${shortcut.label}`}
              aria-selected={isSelected}
              data-label={shortcut.label}
              onPointerDown={(event) => {
                setStartMenuOpen(false);
                if (event.button === 0 && (event.ctrlKey || event.metaKey)) {
                  const next = new Set(selected);
                  if (isSelected) next.delete(shortcut.label);
                  else next.add(shortcut.label);
                  setSelected(next);
                } else if (!isSelected) {
                  setSelected(new Set([shortcut.label]));
                }
              }}
              onDoubleClick={() => launch(shortcut)}
              onClick={(event) => {
                const coarse =
                  typeof window !== "undefined" &&
                  window.matchMedia("(pointer: coarse)").matches;
                if (event.detail === 0 || coarse) {
                  launch(shortcut);
                }
              }}
              onKeyDown={onIconKeyDown}
              onContextMenu={(event) =>
                openContextMenu(event, [
                  { label: "Abrir", bold: true, onSelect: () => launch(shortcut) },
                  "separator",
                  {
                    label: "Propriedades",
                    disabled: "appId" in target,
                    onSelect: "fileId" in target ? () => openApp("properties", target.fileId) : undefined,
                  },
                ])
              }
            >
              <span className="desktop-icon__image" style={{ "--icon": `url("${icon}")` } as CSSProperties}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon} alt="" width={32} height={32} />
              </span>
              <span className="desktop-icon__label">{shortcut.label}</span>
            </button>
          );
        })}
      </div>
      <div ref={marqueeRef} className="desktop-marquee" aria-hidden="true" />
      {children}
    </div>
  );
}
