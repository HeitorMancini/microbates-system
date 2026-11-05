"use client";

import { useEffect, useRef } from "react";
import { getNodesByKind } from "@/content/vfs";
import { useWindowManager } from "@/os/WindowManager";
import type { AppProps } from "@/os/types";
import { Inset, MenuBar } from "@/os/ui";
import { SeekBar, useMediaLifecycle } from "../media";
import { useWaveform } from "./useWaveform";
import styles from "./SoundRecorder.module.css";

const TRACKS = getNodesByKind("audio");

function seconds(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} s`;
}

export function SoundRecorder({ win, file, isVisible, setFile }: AppProps) {
  const { closeWindow, openFile } = useWindowManager();
  const tracks = TRACKS;
  const track = file?.kind === "audio" ? file : undefined;
  const index = track ? tracks.findIndex((t) => t.id === track.id) : -1;

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const media = useMediaLifecycle(audioRef, isVisible, track?.src);
  const connectWaveform = useWaveform(audioRef, canvasRef, media.playing);

  useEffect(() => {
    if (!file && tracks[0]) setFile(tracks[0].id);
  }, [file, tracks, setFile]);

  const play = () => {
    connectWaveform();
    media.play();
  };

  const goTo = (offset: number) => {
    if (!tracks.length) return;
    const next = (index + offset + tracks.length) % tracks.length;
    setFile(tracks[next].id);
  };

  return (
    <div className={styles.root}>
      <MenuBar
        menus={[
          {
            label: "Arquivo",
            items: [
              ...tracks.map((t, i) => ({
                label: `${i + 1} ${t.name}`,
                checked: t.id === track?.id,
                onSelect: () => setFile(t.id),
              })),
              "separator" as const,
              { label: "Sair", onSelect: () => closeWindow(win.id) },
            ],
          },
          { label: "Editar", items: [{ label: "Copiar", disabled: true }] },
          { label: "Efeitos", items: [{ label: "Inverter", disabled: true }, { label: "Adicionar eco", disabled: true }] },
          {
            label: "Ajuda",
            items: [{ label: "Sobre o MicroSystem", onSelect: () => openFile("doc-about") }],
          },
        ]}
      />
      <div className={styles.body}>
        <div className={styles.displayRow}>
          <div className={styles.readout}>
            <span>Posição:</span>
            <span>{seconds(media.currentTime)}</span>
          </div>
          <Inset className={styles.wave}>
            <canvas ref={canvasRef} width={120} height={44} className={styles.canvas} />
            {media.error ? <span className={styles.waveMessage}>Arquivo não encontrado</span> : null}
          </Inset>
          <div className={`${styles.readout} ${styles.readoutRight}`}>
            <span>Duração:</span>
            <span>{seconds(media.duration)}</span>
          </div>
        </div>

        <SeekBar value={media.currentTime} max={media.duration} onSeek={media.seek} />

        <div className={styles.controls}>
          <button type="button" className={styles.control} aria-label="Faixa anterior" onClick={() => goTo(-1)}>
            <span className={styles.glyph}>&#9664;&#9664;</span>
          </button>
          <button type="button" className={styles.control} aria-label="Próxima faixa" onClick={() => goTo(1)}>
            <span className={styles.glyph}>&#9654;&#9654;</span>
          </button>
          {media.playing ? (
            <button type="button" className={styles.control} aria-label="Pausar" onClick={media.pause}>
              <span className={styles.glyph}>&#10074;&#10074;</span>
            </button>
          ) : (
            <button type="button" className={styles.control} aria-label="Reproduzir" onClick={play} disabled={!track || media.error}>
              <span className={styles.glyph}>&#9654;</span>
            </button>
          )}
          <button type="button" className={styles.control} aria-label="Parar" onClick={media.stop} disabled={!track}>
            <span className={styles.stop} />
          </button>
          <button type="button" className={styles.control} aria-label="Gravar" disabled>
            <span className={styles.rec} />
          </button>
        </div>

        <div className={styles.trackInfo} title={track?.notes}>
          {track ? (
            <>
              <strong>{track.name}</strong>
              {track.loop ? " (loop)" : ""}
              {track.bpm ? ` - ${track.bpm} BPM` : ""}
            </>
          ) : (
            "Nenhum som carregado"
          )}
        </div>
      </div>
      <audio ref={audioRef} src={track?.src} loop={track?.loop} preload="metadata" />
    </div>
  );
}
