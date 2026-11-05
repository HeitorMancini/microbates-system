"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoNode, VideoSource } from "@/content/types";
import { getNodesByKind } from "@/content/vfs";
import { useWindowManager } from "@/os/WindowManager";
import type { AppProps } from "@/os/types";
import { Inset, MenuBar, StatusBar } from "@/os/ui";
import { formatTime, SeekBar, useMediaLifecycle } from "../media";
import styles from "./VideoPlayer.module.css";

const VIDEOS = getNodesByKind("video");

function embedUrl(source: VideoSource): string | null {
  if (source.provider === "file" || !source.videoId) return null;
  if (source.provider === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(source.videoId)}?rel=0`;
  }
  return `https://player.vimeo.com/video/${encodeURIComponent(source.videoId)}`;
}

function NoSignal({ message }: { message: string }) {
  return (
    <div className={styles.noSignal}>
      <span>{message}</span>
    </div>
  );
}

export function VideoPlayer({ win, file, isActive, isVisible, setFile }: AppProps) {
  const { closeWindow, openFile, focusWindow } = useWindowManager();
  const video: VideoNode | undefined = file?.kind === "video" ? file : undefined;
  const index = video ? VIDEOS.findIndex((v) => v.id === video.id) : -1;
  const source = video?.source;
  const isFile = source?.provider === "file";
  const embed = source ? embedUrl(source) : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const media = useMediaLifecycle(videoRef, isVisible, isFile ? source.src : undefined);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    if (!file && VIDEOS[0]) setFile(VIDEOS[0].id);
  }, [file, setFile]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    el.volume = volume;
  }, [muted, volume, video?.id]);

  const goTo = (offset: number) => {
    if (!VIDEOS.length) return;
    setFile(VIDEOS[(index + offset + VIDEOS.length) % VIDEOS.length].id);
  };

  const status = !video
    ? "Pronto"
    : !isFile
      ? embed
        ? `Streaming via ${source?.provider === "youtube" ? "YouTube" : "Vimeo"}`
        : "Sem fonte de vídeo"
      : media.error
        ? "Erro ao abrir o arquivo"
        : media.playing
          ? "Reproduzindo"
          : media.currentTime > 0
            ? "Pausado"
            : "Parado";

  const renderScreen = () => {
    if (!video || !source) return <NoSignal message="Nenhum clipe aberto" />;
    if (source.provider === "file") {
      return (
        <>
          <video
            key={video.id}
            ref={videoRef}
            className={styles.video}
            src={source.src}
            poster={source.poster}
            preload="metadata"
            playsInline
            onClick={() => (media.playing ? media.pause() : media.play())}
          />
          {media.error ? <NoSignal message={`Não foi possível abrir ${video.name}`} /> : null}
        </>
      );
    }
    if (!embed) return <NoSignal message="SEM SINAL" />;
    if (!isVisible) return null;
    return (
      <>
        <iframe
          key={embed}
          className={styles.iframe}
          src={embed}
          title={video.name}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
        {!isActive ? (
          <button
            type="button"
            className={styles.focusShield}
            aria-label="Ativar janela"
            onClick={() => focusWindow(win.id)}
          />
        ) : null}
      </>
    );
  };

  const fileControlsDisabled = !isFile || media.error;

  return (
    <div className={styles.root}>
      <MenuBar
        menus={[
          {
            label: "Arquivo",
            items: [
              ...VIDEOS.map((v, i) => ({
                label: `${i + 1} ${v.name}`,
                checked: v.id === video?.id,
                onSelect: () => setFile(v.id),
              })),
              "separator" as const,
              { label: "Sair", onSelect: () => closeWindow(win.id) },
            ],
          },
          {
            label: "Exibir",
            items: [
              { label: "Lista de reprodução", checked: showPlaylist, onSelect: () => setShowPlaylist((v) => !v) },
              { label: "Barra de status", checked: showStatus, onSelect: () => setShowStatus((v) => !v) },
            ],
          },
          {
            label: "Reproduzir",
            items: [
              {
                label: media.playing ? "Pausar" : "Reproduzir",
                onSelect: fileControlsDisabled ? undefined : media.playing ? media.pause : media.play,
              },
              { label: "Parar", onSelect: fileControlsDisabled ? undefined : media.stop },
              "separator",
              { label: "Anterior", onSelect: () => goTo(-1) },
              { label: "Próximo", onSelect: () => goTo(1) },
              "separator",
              { label: "Sem áudio", checked: muted, onSelect: () => setMuted((v) => !v) },
            ],
          },
          {
            label: "Ajuda",
            items: [{ label: "Sobre o MicroSystem", onSelect: () => openFile("doc-about") }],
          },
        ]}
      />

      <div className={styles.main}>
        <div className={styles.stage}>
          <div className={styles.screen}>{renderScreen()}</div>

          <div className={styles.transport}>
            <SeekBar
              value={media.currentTime}
              max={media.duration}
              onSeek={media.seek}
              disabled={fileControlsDisabled}
            />
            <div className={styles.controls}>
              <button
                type="button"
                className={styles.control}
                aria-label="Reproduzir"
                disabled={fileControlsDisabled}
                aria-pressed={media.playing}
                onClick={media.play}
              >
                <span className={styles.glyph}>&#9654;</span>
              </button>
              <button
                type="button"
                className={styles.control}
                aria-label="Pausar"
                disabled={fileControlsDisabled}
                onClick={media.pause}
              >
                <span className={styles.glyph}>&#10074;&#10074;</span>
              </button>
              <button
                type="button"
                className={styles.control}
                aria-label="Parar"
                disabled={fileControlsDisabled}
                onClick={media.stop}
              >
                <span className={styles.stop} />
              </button>
              <span className={styles.divider} />
              <button type="button" className={styles.control} aria-label="Anterior" onClick={() => goTo(-1)}>
                <span className={styles.glyph}>&#9198;</span>
              </button>
              <button type="button" className={styles.control} aria-label="Próximo" onClick={() => goTo(1)}>
                <span className={styles.glyph}>&#9197;</span>
              </button>
              <span className={styles.spacer} />
              <button
                type="button"
                className={styles.control}
                aria-label={muted ? "Ativar áudio" : "Sem áudio"}
                aria-pressed={muted}
                disabled={!isFile}
                onClick={() => setMuted((v) => !v)}
              >
                <span className={styles.glyph}>{muted ? "\u{1F507}" : "\u{1F50A}"}</span>
              </button>
              <input
                type="range"
                className={styles.volume}
                min={0}
                max={1}
                step={0.05}
                value={volume}
                disabled={!isFile}
                aria-label="Volume"
                onChange={(event) => setVolume(Number(event.target.value))}
              />
            </div>
          </div>

          <Inset className={styles.info}>
            <div>
              <span className={styles.infoLabel}>Show:</span> {video?.name ?? "-"}
            </div>
            <div>
              <span className={styles.infoLabel}>Clipe:</span> {video?.description ?? "-"}
            </div>
          </Inset>
        </div>

        {showPlaylist ? (
          <Inset className={styles.playlist}>
            <ul role="listbox" aria-label="Lista de reprodução">
              {VIDEOS.map((v) => (
                <li
                  key={v.id}
                  role="option"
                  aria-selected={v.id === video?.id}
                  onClick={() => setFile(v.id)}
                >
                  {v.name}
                </li>
              ))}
            </ul>
          </Inset>
        ) : null}
      </div>

      {showStatus ? (
        <StatusBar
          fields={[
            status,
            isFile ? `${formatTime(media.currentTime)} / ${formatTime(media.duration)}` : "--:-- / --:--",
          ]}
        />
      ) : null}
    </div>
  );
}
