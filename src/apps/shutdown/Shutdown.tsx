"use client";

import { useId, useState } from "react";
import { useShutDown, type ShutdownMode } from "@/os/power";
import { useWindowManager } from "@/os/WindowManager";
import type { AppProps } from "@/os/types";
import styles from "./Shutdown.module.css";

const OPTIONS: { mode: ShutdownMode; label: string }[] = [
  { mode: "shutdown", label: "Desligar" },
  { mode: "restart", label: "Reiniciar" },
  { mode: "dos", label: "Reiniciar em modo MS-DOS" },
];

export function Shutdown({ win }: AppProps) {
  const { closeWindow } = useWindowManager();
  const shutDown = useShutDown();
  const name = useId();
  const [mode, setMode] = useState<ShutdownMode>("shutdown");

  return (
    <form
      className={styles.root}
      onSubmit={(event) => {
        event.preventDefault();
        shutDown(mode);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeWindow(win.id);
      }}
    >
      <div className={styles.body}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/shutdown.svg" alt="" width={32} height={32} />
        <fieldset className={styles.options}>
          <legend>O que você deseja que o computador faça?</legend>
          {OPTIONS.map((option, i) => (
            <div key={option.mode} className="field-row">
              <input
                id={`${name}-${option.mode}`}
                type="radio"
                name={name}
                checked={mode === option.mode}
                autoFocus={i === 0}
                onChange={() => setMode(option.mode)}
              />
              <label htmlFor={`${name}-${option.mode}`}>{option.label}</label>
            </div>
          ))}
        </fieldset>
      </div>
      <div className={styles.buttons}>
        <button type="submit">OK</button>
        <button type="button" onClick={() => closeWindow(win.id)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
