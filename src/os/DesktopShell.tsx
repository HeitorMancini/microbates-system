"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CrtOverlay } from "@/os/CrtOverlay";
import { DesktopSurface } from "@/os/Desktop";
import { PowerScreen, ShutDownProvider, type PowerPhase, type ShutdownMode } from "@/os/power";
import { Taskbar } from "@/os/Taskbar";
import { PopupLayer, PopupsProvider } from "@/os/ui";
import { WindowFrame } from "@/os/Window";
import { useWindowManager, WindowManagerProvider } from "@/os/WindowManager";

type PowerProps = {
  phase: PowerPhase;
  mode: ShutdownMode;
  onPhase: (phase: PowerPhase) => void;
};

function DesktopInner({ phase, mode, onPhase }: PowerProps) {
  const { windows, openApp } = useWindowManager();

  useEffect(() => {
    if (phase === "on" && mode === "dos") openApp("terminal", undefined, { maximized: true });
  }, [phase, mode, openApp]);

  const tube = phase === "off" ? " desktop--off" : phase === "boot" && mode === "shutdown" ? " desktop--warmup" : "";
  const monitorRef = useRef<HTMLDivElement>(null);
  const bezelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const monitor = monitorRef.current;
    const bezel = bezelRef.current;
    if (!monitor || !bezel) return;
    if (phase !== "off") {
      monitor.style.setProperty("--fit", "1");
      return;
    }
    const margin = 24;
    const fit = () => {
      const { clientWidth, clientHeight } = document.body;
      const scale = Math.min(
        1,
        (clientWidth - 2 * margin) / bezel.offsetWidth,
        (clientHeight - 2 * margin) / bezel.offsetHeight,
      );
      monitor.style.setProperty("--fit", String(Math.max(scale, 0.1)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [phase]);

  return (
    <>
      <div ref={monitorRef} className={`monitor${phase === "off" ? " monitor--off" : ""}`}>
        <div ref={bezelRef} className="monitor__bezel">
          <span className="monitor__brand">MICROBATES</span>
          <div className="monitor__controls">
            <span className={`monitor__led${phase === "off" ? "" : " monitor__led--on"}`} aria-hidden="true" />
            <button
              type="button"
              className="monitor__button"
              aria-label={phase === "off" ? "Ligar o monitor" : "Desligar o MicroSystem"}
              onClick={() => (phase === "off" ? onPhase("boot") : phase === "on" ? openApp("shutdown") : undefined)}
            />
          </div>
        </div>
        <div className="monitor__slope" aria-hidden="true" />
        <div className="monitor__rim" aria-hidden="true" />
        <div className={`desktop${tube}`}>
          <div className="desktop-screen">
            <DesktopSurface>
              {windows.map((win) => (
                <WindowFrame key={win.id} win={win} />
              ))}
            </DesktopSurface>
            <Taskbar />
            <PopupLayer />
            <PowerScreen phase={phase} mode={mode} onPhase={onPhase} />
          </div>
          <CrtOverlay />
        </div>
        <div className="monitor__glass" aria-hidden="true">
          <div className="monitor__reflection" />
        </div>
      </div>
    </>
  );
}

export function DesktopShell() {
  const [phase, setPhase] = useState<PowerPhase>("on");
  const [mode, setMode] = useState<ShutdownMode>("shutdown");
  const [session, setSession] = useState(0);

  const shutDown = useCallback((next: ShutdownMode) => {
    setMode(next);
    setSession((count) => count + 1);
    setPhase("closing");
  }, []);

  return (
    <ShutDownProvider value={shutDown}>
      <WindowManagerProvider key={session}>
        <PopupsProvider>
          <DesktopInner phase={phase} mode={mode} onPhase={setPhase} />
        </PopupsProvider>
      </WindowManagerProvider>
    </ShutDownProvider>
  );
}
