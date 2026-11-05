"use client";

import { createContext, useCallback, useContext, useEffect, useState, type CSSProperties } from "react";

export type ShutdownMode = "shutdown" | "restart" | "dos";
export type PowerPhase = "on" | "closing" | "safe" | "off" | "boot";

const CLOSING_MS = 2000;
const BIOS_MS = 2600;
const SPLASH_MS = 2800;
const MEMORY_KB = 65536;
const MEMORY_TEST_MS = 1200;

const BIOS_LINES = [
  "Microbates BIOS v4.51PG, Energy Star Ally",
  "Copyright (C) 1998-2026, Microbates Company | Interactive & Creative Works",
  "",
  "Pentium II-MMX CPU at 400MHz",
  "Memory Test: {memory}",
  "",
  "Detecting IDE Primary Master ... MICROBATES HD 4.3GB",
  "Detecting IDE Primary Slave  ... None",
  "Detecting IDE Secondary Master ... CD-ROM 24X",
  "",
  "Iniciando MicroSystem...",
];

const ShutDownContext = createContext<(mode: ShutdownMode) => void>(() => {});

export const ShutDownProvider = ShutDownContext.Provider;

export function useShutDown(): (mode: ShutdownMode) => void {
  return useContext(ShutDownContext);
}

function Logo() {
  return (
    <div className="power-logo">
      <span className="start-logo" aria-hidden="true" />
      <span>
        Micro<b>System</b>
      </span>
    </div>
  );
}

function BootScreen({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<"bios" | "splash">("bios");
  const [memory, setMemory] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone();
      return;
    }
    const start = performance.now();
    const counter = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / MEMORY_TEST_MS);
      setMemory(Math.round((progress * MEMORY_KB) / 1024) * 1024);
    }, 40);
    const splash = window.setTimeout(() => setStage("splash"), BIOS_MS);
    const done = window.setTimeout(onDone, BIOS_MS + SPLASH_MS);
    window.addEventListener("keydown", onDone);
    return () => {
      window.clearInterval(counter);
      window.clearTimeout(splash);
      window.clearTimeout(done);
      window.removeEventListener("keydown", onDone);
    };
  }, [onDone]);

  if (stage === "splash") {
    return (
      <div className="power-screen power-screen--sky" onClick={onDone}>
        <Logo />
        <div className="power-progress" />
      </div>
    );
  }

  const memoryText = `${memory}K${memory === MEMORY_KB ? " OK" : ""}`;
  return (
    <div className="power-screen power-screen--black power-bios" onClick={onDone}>
      {BIOS_LINES.map((line, i) => (
        <p key={i} style={{ "--line": i } as CSSProperties}>
          {line.replace("{memory}", memoryText) || "\u00a0"}
        </p>
      ))}
    </div>
  );
}

/** Full-screen shutdown and boot screens, drawn inside `.desktop-screen` so the CRT bends them. */
export function PowerScreen({
  phase,
  mode,
  onPhase,
}: {
  phase: PowerPhase;
  mode: ShutdownMode;
  onPhase: (phase: PowerPhase) => void;
}) {
  const finishBoot = useCallback(() => onPhase("on"), [onPhase]);

  useEffect(() => {
    if (phase !== "closing") return;
    const next: PowerPhase = mode === "shutdown" ? "safe" : mode === "restart" ? "boot" : "on";
    const timer = window.setTimeout(() => onPhase(next), CLOSING_MS);
    return () => window.clearTimeout(timer);
  }, [phase, mode, onPhase]);

  switch (phase) {
    case "on":
      return null;
    case "closing":
      return (
        <div className="power-screen power-screen--sky">
          <Logo />
          <p className="power-message">
            {mode === "shutdown"
              ? "Aguarde enquanto o computador é desligado."
              : "Aguarde enquanto o MicroSystem é reiniciado."}
          </p>
        </div>
      );
    case "safe":
      return (
        <div className="power-screen power-screen--black" onClick={() => onPhase("off")}>
          <p className="power-safe">Agora você pode desligar o computador com segurança.</p>
        </div>
      );
    case "off":
      return <div className="power-screen power-screen--black" />;
    case "boot":
      return <BootScreen onDone={finishBoot} />;
  }
}
