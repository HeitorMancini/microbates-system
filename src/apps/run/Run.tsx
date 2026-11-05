"use client";

import { useId, useState } from "react";
import { APPS } from "@/apps/registry";
import type { ShortcutTarget } from "@/content/types";
import { resolvePath, ROOT_ID } from "@/content/vfs";
import { useWindowManager } from "@/os/WindowManager";
import type { AppProps } from "@/os/types";
import styles from "./Run.module.css";

function resolveTarget(input: string): ShortcutTarget | undefined {
  const value = input.trim();
  const lower = value.toLowerCase();
  const app = APPS.find((candidate) => {
    if (candidate.dialog) return false;
    const exe = candidate.exe.toLowerCase();
    return exe === lower || exe.replace(/\.(exe|com)$/, "") === lower;
  });
  if (app) return { appId: app.id };
  const node = resolvePath(ROOT_ID, value);
  return node ? { fileId: node.id } : undefined;
}

export function Run({ win }: AppProps) {
  const { closeWindow, openApp, openFile } = useWindowManager();
  const inputId = useId();
  const [value, setValue] = useState("");
  const [missing, setMissing] = useState<string | null>(null);

  const submit = () => {
    const target = resolveTarget(value);
    if (!target) {
      setMissing(value.trim());
      return;
    }
    closeWindow(win.id);
    if ("appId" in target) openApp(target.appId);
    else openFile(target.fileId);
  };

  return (
    <form
      className={styles.root}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && missing === null) closeWindow(win.id);
      }}
    >
      <div className={styles.intro}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/run.svg" alt="" width={32} height={32} />
        <p>Digite o nome do programa, pasta ou documento e o MicroSystem o abrirá para você.</p>
      </div>
      <div className={`field-row ${styles.field}`}>
        <label htmlFor={inputId}>Abrir:</label>
        <input
          id={inputId}
          type="text"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <div className={styles.buttons}>
        <button type="submit" disabled={!value.trim()}>
          OK
        </button>
        <button type="button" onClick={() => closeWindow(win.id)}>
          Cancelar
        </button>
      </div>

      {missing !== null ? (
        <div className={styles.modal}>
          <div className="window" role="alertdialog" aria-label={missing}>
            <div className="title-bar">
              <div className="title-bar-text">{missing}</div>
            </div>
            <div className={`window-body ${styles.alertBody}`}>
              <div className={styles.alertText}>
                <span className={styles.errorIcon} aria-hidden="true">
                  ×
                </span>
                <p>
                  Não foi possível encontrar &apos;{missing}&apos;. Verifique se o nome foi digitado
                  corretamente e tente novamente.
                </p>
              </div>
              <button type="button" autoFocus onClick={() => setMissing(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
