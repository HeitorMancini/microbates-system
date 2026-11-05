"use client";

import { useState } from "react";
import type { DocBlock, DocumentFormat, DocumentNode } from "@/content/types";
import { docToPlainText, getNodesByKind } from "@/content/vfs";
import { useWindowManager } from "@/os/WindowManager";
import type { AppProps } from "@/os/types";
import { Inset, MenuBar, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, type MenuItem } from "@/os/ui";
import { renderInline } from "./inline";
import styles from "./DocumentViewer.module.css";

function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as const;
      return <Tag className={styles[`h${block.level}`]}>{renderInline(block.text)}</Tag>;
    }
    case "paragraph":
      return <p className={styles.paragraph}>{renderInline(block.text)}</p>;
    case "image":
      return (
        <figure className={`${styles.figure} ${styles[`align-${block.align ?? "center"}`]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.alt} style={block.width ? { width: block.width } : undefined} />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    case "gallery":
      return (
        <div
          className={styles.gallery}
          style={{ gridTemplateColumns: `repeat(${block.columns ?? 3}, minmax(0, 1fr))` }}
        >
          {block.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image.src} src={image.src} alt={image.alt} title={image.alt} />
          ))}
        </div>
      );
    case "quote":
      return (
        <blockquote className={styles.quote}>
          <p>{renderInline(block.text)}</p>
          {block.author ? <cite>{block.author}</cite> : null}
        </blockquote>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={styles.list}>
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
    }
    case "divider":
      return <hr className={styles.divider} />;
  }
}

function useRecentFiles(format: DocumentFormat): MenuItem[] {
  const { openFile } = useWindowManager();
  const docs = getNodesByKind("document").filter((doc) => doc.format === format);
  return docs.map((doc, i) => ({ label: `${i + 1} ${doc.name}`, onSelect: () => openFile(doc.id) }));
}

function asDocument(file: AppProps["file"]): DocumentNode | undefined {
  return file?.kind === "document" ? file : undefined;
}

function Ruler() {
  return (
    <div className={styles.ruler} aria-hidden="true">
      <div className={styles.rulerTrack}>
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
    </div>
  );
}

export function WordPad({ win, file }: AppProps) {
  const { closeWindow, openFile } = useWindowManager();
  const doc = asDocument(file);
  const recent = useRecentFiles("rtf");
  const [showToolbar, setShowToolbar] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [showStatus, setShowStatus] = useState(true);

  return (
    <div className={styles.root}>
      <MenuBar
        menus={[
          {
            label: "Arquivo",
            items: [...recent, "separator", { label: "Sair", onSelect: () => closeWindow(win.id) }],
          },
          { label: "Editar", items: [{ label: "Somente leitura", disabled: true }] },
          {
            label: "Exibir",
            items: [
              { label: "Barra de ferramentas", checked: showToolbar, onSelect: () => setShowToolbar((v) => !v) },
              { label: "Régua", checked: showRuler, onSelect: () => setShowRuler((v) => !v) },
              { label: "Barra de status", checked: showStatus, onSelect: () => setShowStatus((v) => !v) },
            ],
          },
          { label: "Inserir", items: [{ label: "Objeto...", disabled: true }] },
          { label: "Formatar", items: [{ label: "Fonte...", disabled: true }] },
          {
            label: "Ajuda",
            items: [{ label: "Sobre o MicroSystem", onSelect: () => openFile("doc-about") }],
          },
        ]}
      />
      {showToolbar ? (
        <Toolbar>
          <select className={styles.select} disabled defaultValue="Times New Roman" aria-label="Fonte">
            <option>Times New Roman</option>
          </select>
          <select className={styles.selectSmall} disabled defaultValue="12" aria-label="Tamanho">
            <option>12</option>
          </select>
          <ToolbarSeparator />
          <ToolbarButton disabled aria-label="Negrito">
            <b>N</b>
          </ToolbarButton>
          <ToolbarButton disabled aria-label="Itálico">
            <i>I</i>
          </ToolbarButton>
          <ToolbarButton disabled aria-label="Sublinhado">
            <u>S</u>
          </ToolbarButton>
        </Toolbar>
      ) : null}
      {showRuler ? <Ruler /> : null}
      <Inset className={styles.canvas}>
        <div className={styles.scroll}>
          <article className={styles.page}>
            {doc ? (
              doc.blocks.map((block, i) => <Block key={i} block={block} />)
            ) : (
              <p className={styles.hint}>Abra um documento pelo menu Arquivo.</p>
            )}
          </article>
        </div>
      </Inset>
      {showStatus ? (
        <StatusBar fields={["Para obter Ajuda, pressione F1", doc ? "Somente leitura" : "NUM"]} />
      ) : null}
    </div>
  );
}

export function Notepad({ win, file }: AppProps) {
  const { closeWindow, openFile } = useWindowManager();
  const doc = asDocument(file);
  const recent = useRecentFiles("txt");
  const [wrap, setWrap] = useState(true);

  return (
    <div className={styles.root}>
      <MenuBar
        menus={[
          {
            label: "Arquivo",
            items: [...recent, "separator", { label: "Sair", onSelect: () => closeWindow(win.id) }],
          },
          {
            label: "Editar",
            items: [{ label: "Quebra automática de linha", checked: wrap, onSelect: () => setWrap((v) => !v) }],
          },
          { label: "Pesquisar", items: [{ label: "Localizar...", disabled: true }] },
          {
            label: "Ajuda",
            items: [{ label: "Sobre o MicroSystem", onSelect: () => openFile("doc-about") }],
          },
        ]}
      />
      <Inset className={styles.canvas}>
        <pre className={`${styles.plain}${wrap ? ` ${styles.wrap}` : ""}`}>
          {doc ? docToPlainText(doc.blocks) : ""}
        </pre>
      </Inset>
    </div>
  );
}
