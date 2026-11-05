"use client";

import type { ReactNode } from "react";
import { getChildren, getPath, iconForNode, kindLabel } from "@/content/vfs";
import { useWindowManager } from "@/os/WindowManager";
import type { AppProps } from "@/os/types";
import styles from "./Properties.module.css";

function formatDate(iso?: string): string {
  if (!iso) return "Desconhecido";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

export function Properties({ win, file }: AppProps) {
  const { closeWindow } = useWindowManager();
  if (!file) return null;

  const children = file.kind === "folder" ? getChildren(file.id) : [];
  const folders = children.filter((child) => child.kind === "folder").length;
  const close = () => closeWindow(win.id);

  return (
    <div className={styles.root}>
      <menu role="tablist" className={styles.tabs}>
        <li role="tab" aria-selected="true">
          <a href="#geral" onClick={(event) => event.preventDefault()}>
            Geral
          </a>
        </li>
      </menu>
      <div className={`window ${styles.panel}`} role="tabpanel">
        <div className="window-body">
          <div className={styles.header}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconForNode(file)} alt="" width={32} height={32} />
            <input type="text" readOnly value={file.name} aria-label="Nome" />
          </div>
          <hr className={styles.rule} />
          <dl className={styles.rows}>
            <Row label="Tipo:">{kindLabel(file)}</Row>
            <Row label="Local:">{file.parentId ? getPath(file.parentId) : "Área de trabalho"}</Row>
            {file.kind === "folder" ? (
              <Row label="Contém:">
                {children.length - folders} arquivo(s), {folders} pasta(s)
              </Row>
            ) : null}
            {file.kind === "link" ? <Row label="URL:">{file.url}</Row> : null}
          </dl>
          <hr className={styles.rule} />
          <dl className={styles.rows}>
            <Row label="Criado em:">{formatDate(file.createdAt)}</Row>
          </dl>
        </div>
      </div>
      <div className={styles.buttons}>
        <button type="button" onClick={close}>
          OK
        </button>
        <button type="button" onClick={close}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
