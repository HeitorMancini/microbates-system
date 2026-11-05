"use client";

import { useEffect, useState } from "react";
import { StartMenu } from "@/os/StartMenu";
import { usePopups } from "@/os/ui";
import { windowMenuItems } from "@/os/windowMenu";
import { useWindowManager } from "@/os/WindowManager";

function formatClock(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isTruncated(button: HTMLElement): boolean {
  const label = button.querySelector("span");
  return !!label && label.scrollWidth > label.clientWidth;
}

export function Taskbar() {
  const {
    windows,
    focusedId,
    startMenuOpen,
    toggleTaskbarWindow,
    restoreWindow,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
    setStartMenuOpen,
  } = useWindowManager();
  const { openContextMenu, tooltip } = usePopups();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!startMenuOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStartMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startMenuOpen, setStartMenuOpen]);

  return (
    <div className="taskbar" role="toolbar" aria-label="Barra de tarefas">
      <button
        type="button"
        className={`start-button${startMenuOpen ? " start-button--active" : ""}`}
        aria-label="Iniciar"
        aria-expanded={startMenuOpen}
        aria-haspopup="menu"
        onClick={() => setStartMenuOpen(!startMenuOpen)}
        {...tooltip("Clique aqui para começar.", () => !startMenuOpen)}
      >
        <span className="start-logo" aria-hidden="true" />
        Iniciar
      </button>

      {startMenuOpen ? <StartMenu /> : null}

      <div className="taskbar-programs">
        {windows.map((win) => {
          const pressed = focusedId === win.id && win.mode !== "minimized";
          return (
            <button
              key={win.id}
              type="button"
              className={`taskbar-app${pressed ? " taskbar-app--active" : ""}`}
              aria-pressed={pressed}
              aria-label={win.title}
              data-taskbar-id={win.id}
              onClick={() => toggleTaskbarWindow(win.id)}
              onContextMenu={(event) =>
                openContextMenu(
                  event,
                  windowMenuItems(win, { restoreWindow, minimizeWindow, maximizeWindow, closeWindow }),
                )
              }
              {...tooltip(win.title, isTruncated)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={win.icon} alt="" width={16} height={16} />
              <span>{win.title}</span>
            </button>
          );
        })}
      </div>

      <div className="taskbar-tray" aria-label="Relógio" {...tooltip(now ? formatLongDate(now) : "")}>
        <time dateTime={now ? now.toISOString() : undefined}>
          {now ? formatClock(now) : "--:--"}
        </time>
      </div>
    </div>
  );
}
