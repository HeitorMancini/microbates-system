"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import {
  DEFAULT_DISPLAY_SETTINGS,
  setDisplaySettings,
  useDisplaySettings,
  type DisplaySettings,
} from "@/os/displaySettings";
import { curvedness, TUBE_RADIUS_MAX_MM, TUBE_RADIUS_MIN_MM } from "@/os/crtGeometry";
import { useWindowManager } from "@/os/WindowManager";
import type { AppProps } from "@/os/types";
import styles from "./ControlPanel.module.css";

type Tab = "tela" | "efeitos";

type BooleanKey = {
  [K in keyof DisplaySettings]: DisplaySettings[K] extends boolean ? K : never;
}[keyof DisplaySettings];

type NumberKey = {
  [K in keyof DisplaySettings]: DisplaySettings[K] extends number ? K : never;
}[keyof DisplaySettings];

function Checkbox({
  label,
  setting,
  disabled,
}: {
  label: string;
  setting: BooleanKey;
  disabled?: boolean;
}) {
  const id = useId();
  const settings = useDisplaySettings();
  return (
    <div className="field-row">
      <input
        id={id}
        type="checkbox"
        checked={settings[setting]}
        disabled={disabled}
        onChange={(event) => setDisplaySettings({ [setting]: event.target.checked })}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

function Slider({
  label,
  setting,
  disabled,
  low = "Baixa",
  high = "Alta",
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  setting: NumberKey;
  disabled?: boolean;
  low?: string;
  high?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  const settings = useDisplaySettings();
  return (
    <div className={`field-row ${styles.sliderRow}`}>
      <label htmlFor={id} className={styles.sliderLabel}>
        {label}
      </label>
      <span className={styles.sliderEnd}>{low}</span>
      <input
        id={id}
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={settings[setting]}
        disabled={disabled}
        onChange={(event) => setDisplaySettings({ [setting]: Number(event.target.value) })}
      />
      <span className={styles.sliderEnd}>{high}</span>
    </div>
  );
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className={styles.group}>
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

function MonitorPreview({ settings }: { settings: DisplaySettings }) {
  const on = settings.enabled;
  const radius = on && settings.bezel ? 4 + curvedness(settings.tubeRadius) * 14 : 0;
  const vars = {
    "--preview-radius": `${radius}px`,
    "--preview-scan": on && settings.scanlines ? settings.scanlinesIntensity / 100 : 0,
    "--preview-vignette": on && settings.vignette ? settings.vignetteIntensity / 100 : 0,
    "--preview-rgb": on && settings.rgb ? `${(settings.rgbIntensity / 100) * 2}px` : "0px",
  } as CSSProperties;

  return (
    <div className={styles.monitor} style={vars} aria-hidden="true">
      <div className={styles.case}>
        <div className={styles.screen}>
          <div className={styles.miniIcon} />
          <div className={styles.miniIcon} />
          <div className={styles.miniWindow}>
            <div className={styles.miniTitle} />
          </div>
          <div className={styles.miniTaskbar} />
          <div className={styles.previewLines} />
          <div className={styles.previewVignette} />
        </div>
        <div className={styles.led} />
      </div>
      <div className={styles.stand} />
    </div>
  );
}

export function ControlPanel({ win }: AppProps) {
  const { closeWindow } = useWindowManager();
  const settings = useDisplaySettings();
  const [saved, setSaved] = useState(settings);
  const [tab, setTab] = useState<Tab>("tela");
  const dirty = JSON.stringify(saved) !== JSON.stringify(settings);
  const off = !settings.enabled;

  const cancel = () => {
    setDisplaySettings(saved);
    closeWindow(win.id);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "tela", label: "Tela" },
    { id: "efeitos", label: "Efeitos" },
  ];

  return (
    <div className={styles.root}>
      <menu role="tablist" className={styles.tabs}>
        {tabs.map((t) => (
          <li key={t.id} role="tab" aria-selected={tab === t.id}>
            <a
              href={`#${t.id}`}
              onClick={(event) => {
                event.preventDefault();
                setTab(t.id);
              }}
            >
              {t.label}
            </a>
          </li>
        ))}
      </menu>

      <div className={`window ${styles.panel}`} role="tabpanel">
        <div className={`window-body ${styles.panelBody}`}>
          {tab === "tela" ? (
            <>
              <MonitorPreview settings={settings} />
              <Group legend="Monitor">
                <Checkbox label="Ativar efeitos de monitor CRT" setting="enabled" />
              </Group>
              <Group legend="Tubo de imagem">
                <Checkbox label="Moldura do monitor" setting="bezel" disabled={off} />
                <Slider
                  label="Raio do tubo:"
                  setting="tubeRadius"
                  low="Curvo"
                  high="Plano"
                  min={TUBE_RADIUS_MIN_MM}
                  max={TUBE_RADIUS_MAX_MM}
                  step={100}
                  disabled={off}
                />
                <p className={styles.hint}>
                  {settings.tubeRadius} mm —{" "}
                  {settings.tubeRadius <= 2000
                    ? "tubo antigo (abaulado)"
                    : settings.tubeRadius < 3000
                      ? "tubo dos anos 90"
                      : "tubo moderno (quase plano)"}
                </p>
                <Checkbox label="Curvar a imagem da tela" setting="warp" disabled={off} />
                <Checkbox label="Vinheta (bordas escurecidas)" setting="vignette" disabled={off} />
                <Slider
                  label="Intensidade:"
                  setting="vignetteIntensity"
                  disabled={off || !settings.vignette}
                />
                <Checkbox label="Reflexos no vidro" setting="reflection" disabled={off} />
                <Slider
                  label="Intensidade:"
                  setting="reflectionIntensity"
                  disabled={off || !settings.reflection}
                />
              </Group>
              <div className={styles.restoreRow}>
                <button type="button" onClick={() => setDisplaySettings(DEFAULT_DISPLAY_SETTINGS)}>
                  Restaurar padrão
                </button>
              </div>
            </>
          ) : (
            <>
              <Group legend="Linhas de varredura">
                <Checkbox label="Mostrar linhas" setting="scanlines" disabled={off} />
                <Slider
                  label="Intensidade:"
                  setting="scanlinesIntensity"
                  disabled={off || !settings.scanlines}
                />
                <Checkbox
                  label="Rolagem contínua"
                  setting="scanlinesScroll"
                  disabled={off || !settings.scanlines}
                />
              </Group>
              <Group legend="Aberração cromática">
                <Checkbox label="Separar canais RGB" setting="rgb" disabled={off} />
                <Slider label="Intensidade:" setting="rgbIntensity" disabled={off || !settings.rgb} />
              </Group>
              <Group legend="Ruído e cintilação">
                <Checkbox label="Estática (grão)" setting="noise" disabled={off} />
                <Slider label="Intensidade:" setting="noiseIntensity" disabled={off || !settings.noise} />
                <Checkbox label="Cintilação" setting="flicker" disabled={off} />
                <Slider
                  label="Intensidade:"
                  setting="flickerIntensity"
                  disabled={off || !settings.flicker}
                />
                <Checkbox label="Faixa de interferência (VHS)" setting="band" disabled={off} />
              </Group>
            </>
          )}
        </div>
      </div>

      <div className={styles.buttons}>
        <button type="button" onClick={() => closeWindow(win.id)}>
          OK
        </button>
        <button type="button" onClick={cancel}>
          Cancelar
        </button>
        <button type="button" disabled={!dirty} onClick={() => setSaved(settings)}>
          Aplicar
        </button>
      </div>
    </div>
  );
}
