"use client";

import { useCallback, useEffect, useState } from "react";
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

  return (
    <>
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
      {phase === "off" ? (
        <button type="button" className="power-button" onClick={() => onPhase("boot")}>
          <span className="power-button__icon" aria-hidden="true" />
          Ligar
        </button>
      ) : null}
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
