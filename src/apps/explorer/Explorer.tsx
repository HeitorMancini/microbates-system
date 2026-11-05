"use client";

import { useState, type KeyboardEvent } from "react";
import type { VfsNode } from "@/content/types";
import { getChildren, getPath, iconForNode, kindLabel, ROOT_ID } from "@/content/vfs";
import { useWindowManager } from "@/os/WindowManager";
import type { AppProps } from "@/os/types";
import { Inset, MenuBar, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator } from "@/os/ui";
import styles from "./Explorer.module.css";

type ViewMode = "icons" | "details";

function displayName(node: VfsNode): string {
  return node.id === ROOT_ID ? "Disco local (C:)" : node.name;
}

function typeLabel(node: VfsNode): string {
  return node.id === ROOT_ID ? "Disco local" : kindLabel(node);
}

function isTouch(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

export function Explorer({ win, file, setFile }: AppProps) {
  const { openFile, closeWindow } = useWindowManager();
  const [view, setView] = useState<ViewMode>("icons");
  const [history, setHistory] = useState<(string | undefined)[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const folder = file?.kind === "folder" ? file : undefined;
  const items = getChildren(folder?.id ?? null);
  const selected = items.find((item) => item.id === selectedId);
  const address = folder ? getPath(folder.id) : "Meu Computador";

  const navigate = (folderId: string | undefined) => {
    setHistory((prev) => [...prev, folder?.id]);
    setSelectedId(null);
    setFile(folderId);
  };

  const goBack = () => {
    if (!history.length) return;
    setSelectedId(null);
    setFile(history[history.length - 1]);
    setHistory((prev) => prev.slice(0, -1));
  };

  const goUp = () => {
    if (!folder) return;
    navigate(folder.parentId ?? undefined);
  };

  const open = (node: VfsNode) => {
    if (node.kind === "folder") navigate(node.id);
    else openFile(node.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && selected) open(selected);
    if (event.key === "Backspace") goUp();
  };

  const itemProps = (node: VfsNode) => ({
    onClick: () => {
      setSelectedId(node.id);
      if (isTouch()) open(node);
    },
    onDoubleClick: () => open(node),
  });

  const statusText = selected
    ? selected.kind === "link"
      ? (selected.description ?? selected.url)
      : typeLabel(selected)
    : `${items.length} objeto(s)`;

  return (
    <div className={styles.root}>
      <MenuBar
        menus={[
          {
            label: "Arquivo",
            items: [
              { label: "Abrir", onSelect: selected ? () => open(selected) : undefined },
              "separator",
              { label: "Fechar", onSelect: () => closeWindow(win.id) },
            ],
          },
          {
            label: "Exibir",
            items: [
              { label: "Ícones grandes", checked: view === "icons", onSelect: () => setView("icons") },
              { label: "Detalhes", checked: view === "details", onSelect: () => setView("details") },
            ],
          },
          {
            label: "Ir",
            items: [
              { label: "Voltar", onSelect: history.length ? goBack : undefined },
              { label: "Acima um nível", onSelect: folder ? goUp : undefined },
              "separator",
              { label: "Meu Computador", onSelect: () => navigate(undefined) },
              { label: "C:\\", onSelect: () => navigate(ROOT_ID) },
            ],
          },
          {
            label: "Ajuda",
            items: [{ label: "Sobre o MicroSystem", onSelect: () => openFile("doc-about") }],
          },
        ]}
      />
      <Toolbar>
        <ToolbarButton onClick={goBack} disabled={!history.length} title="Voltar">
          <span className={styles.glyph}>&#9668;</span> Voltar
        </ToolbarButton>
        <ToolbarButton onClick={goUp} disabled={!folder} title="Acima">
          <span className={styles.glyph}>&#9650;</span> Acima
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton pressed={view === "icons"} onClick={() => setView("icons")} title="Ícones grandes">
          Ícones
        </ToolbarButton>
        <ToolbarButton pressed={view === "details"} onClick={() => setView("details")} title="Detalhes">
          Detalhes
        </ToolbarButton>
      </Toolbar>
      <div className={styles.addressRow}>
        <span className={styles.addressLabel}>Endereço</span>
        <Inset className={styles.address}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={folder ? iconForNode(folder) : "/icons/computer.svg"} alt="" width={16} height={16} />
          <span>{address}</span>
        </Inset>
      </div>
      <Inset className={styles.content} tabIndex={0} onKeyDown={onKeyDown}>
        <div
          className={styles.pane}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          {items.length === 0 ? <p className={styles.empty}>Esta pasta está vazia.</p> : null}
          {view === "icons" ? (
            <ul className={styles.grid} role="listbox" aria-label={address}>
              {items.map((node) => (
                <li
                  key={node.id}
                  role="option"
                  aria-selected={selectedId === node.id}
                  className={styles.iconItem}
                  {...itemProps(node)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={iconForNode(node)} alt="" width={32} height={32} />
                  <span>{displayName(node)}</span>
                </li>
              ))}
            </ul>
          ) : items.length ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Modificado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((node) => (
                  <tr
                    key={node.id}
                    className={styles.row}
                    aria-selected={selectedId === node.id}
                    {...itemProps(node)}
                  >
                    <td>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={iconForNode(node)} alt="" width={16} height={16} />
                      <span>{displayName(node)}</span>
                    </td>
                    <td>{typeLabel(node)}</td>
                    <td>
                      {node.createdAt
                        ? new Date(`${node.createdAt}T00:00:00`).toLocaleDateString("pt-BR")
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </Inset>
      <StatusBar fields={[statusText, folder ? "Meu Computador" : ""]} />
    </div>
  );
}
