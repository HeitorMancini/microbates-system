"use client";

import { useEffect, useRef, useState } from "react";
import type { LinkNode } from "@/content/types";
import { getNodesByKind } from "@/content/vfs";
import { useWindowManager } from "@/os/WindowManager";
import type { AppProps } from "@/os/types";
import { Inset, MenuBar, StatusBar } from "@/os/ui";
import {
  BackIcon,
  ExternalIcon,
  ForwardIcon,
  GlobeIcon,
  HomeIcon,
  PageIcon,
  RefreshIcon,
  StopIcon,
  WarningIcon,
} from "./icons";
import { PageScaler } from "./PageScaler";
import styles from "./InternetExplorer.module.css";

const HOME = "about:home";
const LINKS = getNodesByKind("link");
const FAKE_LOAD_MS = 700;
const RESOLUTIONS = [
  { label: "720p (1280 x 720)", width: 1280 },
  { label: "1080p (1920 x 1080)", width: 1920 },
];

type Entry = { url: string; nodeId?: string };

function normalizeUrl(raw: string): string {
  const value = raw.trim();
  if (!value || value === HOME) return HOME;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function entryFor(url: string): Entry {
  const node = LINKS.find((link) => link.url === url);
  return { url, nodeId: node?.id };
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function HomePage({ onNavigate }: { onNavigate: (entry: Entry) => void }) {
  return (
    <div className={styles.home}>
      <header className={styles.homeHeader}>
        <span className={styles.homeLogo}>hesmOS</span>
        <span>na Web</span>
      </header>
      <div className={styles.homeBody}>
        <h1>Bem-vindo à Internet</h1>
        <p>Projetos de engenharia e sites publicados. Escolha um destino:</p>
        <ul className={styles.homeLinks}>
          {LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={link.url}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate({ url: link.url, nodeId: link.id });
                }}
              >
                {link.name}
              </a>
              {link.description ? <p>{link.description}</p> : null}
              {link.stack?.length ? <p className={styles.stack}>{link.stack.join(" · ")}</p> : null}
            </li>
          ))}
        </ul>
        <p className={styles.homeFooter}>Melhor visualizado em 800x600 com Internet Explorer 5.</p>
      </div>
    </div>
  );
}

function InfoBar({ url }: { url: string }) {
  return (
    <button
      type="button"
      className={styles.infoBar}
      data-cursor="pointer"
      onClick={() => openExternal(url)}
    >
      <WarningIcon />
      <span>
        Este site não permite ser exibido dentro de outra janela. Clique aqui para abrir em uma nova
        aba.
      </span>
    </button>
  );
}

function BlockedPage({ url, node }: { url: string; node?: LinkNode }) {
  return (
    <div className={styles.blocked}>
      {node?.preview ? (
        <button
          type="button"
          className={styles.previewImage}
          data-cursor="pointer"
          onClick={() => openExternal(url)}
          title="Abrir site em nova aba"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={node.preview} alt={`Captura de ${node.name}`} />
        </button>
      ) : (
        <div className={styles.errorPage}>
          <h1>Não é possível exibir a página</h1>
          <p>A página que você está procurando não pode ser exibida dentro desta janela.</p>
          <hr />
          <p>Tente o seguinte:</p>
          <ul>
            <li>
              Clique no botão <b>Nova aba</b> para abrir <b>{url}</b> no seu navegador.
            </li>
            <li>Clique no botão <b>Voltar</b> para tentar outro link.</li>
          </ul>
          <button type="button" onClick={() => openExternal(url)}>
            Abrir site em nova aba
          </button>
        </div>
      )}
    </div>
  );
}

export function InternetExplorer({ win, file, setFile }: AppProps) {
  const { closeWindow } = useWindowManager();
  const initial: Entry =
    file?.kind === "link" ? { url: file.url, nodeId: file.id } : { url: HOME };
  const [history, setHistory] = useState<Entry[]>([initial]);
  const [index, setIndex] = useState(0);
  const [address, setAddress] = useState(initial.url);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [showStatus, setShowStatus] = useState(true);
  const [pageWidth, setPageWidth] = useState(RESOLUTIONS[0].width);
  const timer = useRef<number | undefined>(undefined);

  const current = history[index];
  const node = LINKS.find((link) => link.id === current.nodeId);
  const isHome = current.url === HOME;
  const embeddable = !isHome && node?.embeddable !== false;

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!loading || embeddable) return;
    timer.current = window.setTimeout(() => setLoading(false), FAKE_LOAD_MS);
    return () => window.clearTimeout(timer.current);
  }, [loading, embeddable, index, reloadKey]);

  const show = (nextIndex: number, entries: Entry[]) => {
    const entry = entries[nextIndex];
    setIndex(nextIndex);
    setAddress(entry.url);
    setLoading(true);
    setFile(entry.nodeId);
  };

  const navigate = (entry: Entry) => {
    const entries = [...history.slice(0, index + 1), entry];
    setHistory(entries);
    show(entries.length - 1, entries);
  };

  const go = (raw: string) => navigate(entryFor(normalizeUrl(raw)));
  const back = () => index > 0 && show(index - 1, history);
  const forward = () => index < history.length - 1 && show(index + 1, history);
  const refresh = () => {
    setReloadKey((key) => key + 1);
    setLoading(true);
  };

  const status = loading
    ? `Abrindo página ${isHome ? "inicial" : current.url}...`
    : embeddable || isHome
      ? "Concluído"
      : "Concluído, mas a página não pôde ser exibida nesta janela";

  return (
    <div className={styles.root}>
      <div className={styles.chromeTop}>
        <MenuBar
          menus={[
            {
              label: "Arquivo",
              items: [
                {
                  label: "Abrir em nova aba",
                  onSelect: isHome ? undefined : () => openExternal(current.url),
                },
                "separator",
                { label: "Fechar", onSelect: () => closeWindow(win.id) },
              ],
            },
            { label: "Editar", items: [{ label: "Copiar", disabled: true }] },
            {
              label: "Exibir",
              items: [
                { label: "Barra de status", checked: showStatus, onSelect: () => setShowStatus((v) => !v) },
                "separator",
                ...RESOLUTIONS.map((res) => ({
                  label: res.label,
                  checked: pageWidth === res.width,
                  onSelect: () => setPageWidth(res.width),
                })),
                "separator",
                { label: "Atualizar", onSelect: refresh },
              ],
            },
            {
              label: "Favoritos",
              items: LINKS.map((link) => ({
                label: link.name,
                onSelect: () => navigate({ url: link.url, nodeId: link.id }),
              })),
            },
            { label: "Ferramentas", items: [{ label: "Opções da Internet...", disabled: true }] },
            { label: "Ajuda", items: [{ label: "Página inicial", onSelect: () => go(HOME) }] },
          ]}
        />
        <div className={`${styles.throbber}${loading ? ` ${styles.throbberActive}` : ""}`} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/ie.svg" alt="" width={22} height={22} />
        </div>
      </div>

      <div className={styles.toolbar} role="toolbar">
        <button type="button" className={styles.tool} onClick={back} disabled={index === 0}>
          <BackIcon />
          <span>Voltar</span>
        </button>
        <button type="button" className={styles.tool} onClick={forward} disabled={index >= history.length - 1}>
          <ForwardIcon />
          <span>Avançar</span>
        </button>
        <button type="button" className={styles.tool} onClick={() => setLoading(false)} disabled={!loading}>
          <StopIcon />
          <span>Parar</span>
        </button>
        <button type="button" className={styles.tool} onClick={refresh}>
          <RefreshIcon />
          <span>Atualizar</span>
        </button>
        <button type="button" className={styles.tool} onClick={() => go(HOME)}>
          <HomeIcon />
          <span>Início</span>
        </button>
        <span className={styles.toolSeparator} />
        <button
          type="button"
          className={styles.tool}
          onClick={() => openExternal(current.url)}
          disabled={isHome}
          title="Abrir este site em uma nova aba do seu navegador"
        >
          <ExternalIcon />
          <span>Nova aba</span>
        </button>
      </div>

      <form
        className={styles.addressRow}
        onSubmit={(event) => {
          event.preventDefault();
          go(address);
        }}
      >
        <label htmlFor={`${win.id}-address`}>Endereço</label>
        <Inset className={styles.address}>
          <PageIcon />
          <input
            id={`${win.id}-address`}
            value={address === HOME ? "" : address}
            placeholder="about:home"
            onChange={(event) => setAddress(event.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </Inset>
        <button type="submit" className={styles.goButton}>
          Ir
        </button>
      </form>

      <Inset className={styles.viewport}>
        {!isHome && !embeddable ? <InfoBar url={current.url} /> : null}
        <PageScaler width={pageWidth}>
          {isHome ? (
            <HomePage onNavigate={navigate} />
          ) : embeddable ? (
            <iframe
              key={`${current.url}-${reloadKey}`}
              className={styles.frame}
              src={current.url}
              title={node?.name ?? current.url}
              onLoad={() => setLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : (
            <BlockedPage key={reloadKey} url={current.url} node={node} />
          )}
        </PageScaler>
        {loading && !embeddable ? <div className={styles.loadingVeil} /> : null}
      </Inset>

      {showStatus ? (
        <StatusBar
          fields={[
            <span key="status" className={styles.statusText}>
              {status}
              {loading ? <span className={styles.progress} /> : null}
            </span>,
            <span key="zone" className={styles.zone}>
              <GlobeIcon /> Internet
            </span>,
          ]}
        />
      ) : null}
    </div>
  );
}
