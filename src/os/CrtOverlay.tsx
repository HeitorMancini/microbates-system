"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { CrtCursor } from "@/os/CrtCursor";
import { warpCoefficients, type WarpCoefficients } from "@/os/crtGeometry";
import { setDisplaySettings, useDisplaySettings } from "@/os/displaySettings";
import { uiScale, viewportSize } from "@/os/scale";

const LINE_SPACING = 5;
const LINE_WIDTH = 2;
const MAX_RGB_SHIFT = 1.4;
const LINE_COLOR = "rgba(0, 0, 0, 0.3)";
const TINTS = ["rgba(255, 40, 120, 0.15)", "rgba(40, 255, 200, 0.12)", "rgba(80, 120, 255, 0.12)"];
const SCANLINE_PERIOD = LINE_SPACING * TINTS.length;
const NOISE_SIZE = 160;
const WARP_MAP_SIZE = 256;
const SCREEN_TONE = "contrast(1.04) saturate(1.1) brightness(1.12)";
const MAX_CANVAS_DPR = 2;

function drawScanlines(canvas: HTMLCanvasElement, curvature: number) {
  const scale = uiScale();
  const dpr = Math.min((window.devicePixelRatio || 1) * scale, MAX_CANVAS_DPR);
  const viewport = viewportSize();
  const width = viewport.width;
  const height = viewport.height + SCANLINE_PERIOD;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.setProperty("--crt-period", `${SCANLINE_PERIOD}px`);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = LINE_WIDTH;

  const cy = SCANLINE_PERIOD + viewport.height / 2;
  const reach = Math.max(cy, height - cy) / (1 - curvature) + LINE_SPACING;
  const start = -Math.ceil(reach / (LINE_SPACING / 2));
  const end = -start;

  for (let i = start; i <= end; i++) {
    const offset = i * (LINE_SPACING / 2);
    const y = cy + offset;
    const edgeY = cy + offset * (1 - curvature);
    const controlY = 2 * y - edgeY;
    const index = i - start;

    ctx.strokeStyle = index % 2 === 0 ? LINE_COLOR : TINTS[(index >> 1) % TINTS.length];
    ctx.beginPath();
    ctx.moveTo(0, edgeY);
    ctx.quadraticCurveTo(width / 2, controlY, width, edgeY);
    ctx.stroke();
  }
}

/** feDisplacementMap scale (in bounding-box units) matching `warpMap`. */
function warpScale({ horizontal, vertical }: WarpCoefficients): number {
  return Math.max(horizontal / (1 - horizontal), vertical / (1 - vertical));
}

/**
 * Displacement map for feDisplacementMap. Inverts the scanline model
 * (screenY = y * (1 - h * screenX^2), screenX = x * (1 - v * screenY^2)) so
 * content bends exactly like the drawn lines. Red/green encode the X/Y source
 * offset, normalised to `warpScale`.
 */
function warpMap(coefficients: WarpCoefficients): string {
  const canvas = document.createElement("canvas");
  canvas.width = WARP_MAP_SIZE;
  canvas.height = WARP_MAP_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const image = ctx.createImageData(WARP_MAP_SIZE, WARP_MAP_SIZE);
  const { horizontal, vertical } = coefficients;
  const range = 2 * warpScale(coefficients);
  for (let py = 0; py < WARP_MAP_SIZE; py++) {
    const sy = ((py + 0.5) / WARP_MAP_SIZE) * 2 - 1;
    for (let px = 0; px < WARP_MAP_SIZE; px++) {
      const sx = ((px + 0.5) / WARP_MAP_SIZE) * 2 - 1;
      const x = sx / (1 - vertical * sy * sy);
      const y = sy / (1 - horizontal * sx * sx);
      const i = (py * WARP_MAP_SIZE + px) * 4;
      image.data[i] = Math.round((0.5 + (x - sx) / range) * 255);
      image.data[i + 1] = Math.round((0.5 + (y - sy) / range) * 255);
      image.data[i + 2] = 0;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

const PERF_KEY = "hesmos:perf-checked";
const PERF_SAMPLES = 120;
const PERF_MAX_MEDIAN_MS = 34;

/**
 * Runs once per browser: after the page settles it times ~120 frames and, if the
 * median frame takes longer than ~30 fps allows, switches the heavy effects off.
 * An idle screen keeps its filtered result cached, so a 1px probe inside the
 * filtered screen changes colour every frame to make each sample pay for the
 * full warp pass, as a drag, a playing video or a blinking caret would.
 * The Control Panel can turn them back on.
 */
function usePerformanceGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    try {
      if (window.localStorage.getItem(PERF_KEY)) return;
    } catch {
      return;
    }
    const screen = document.querySelector<HTMLElement>(".desktop-screen");
    if (!screen) return;
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none;";
    const samples: number[] = [];
    let last = 0;
    let frame = 0;
    let tick = false;

    const loop = (time: number) => {
      if (last && !document.hidden) samples.push(time - last);
      last = time;
      if (samples.length < PERF_SAMPLES) {
        tick = !tick;
        probe.style.backgroundColor = tick ? "rgba(0, 0, 0, 0.01)" : "rgba(0, 0, 0, 0.02)";
        frame = requestAnimationFrame(loop);
        return;
      }
      probe.remove();
      samples.sort((a, b) => a - b);
      const median = samples[samples.length >> 1];
      try {
        window.localStorage.setItem(PERF_KEY, "1");
      } catch {
        // Without storage the check just runs again next visit.
      }
      if (median > PERF_MAX_MEDIAN_MS) setDisplaySettings({ lite: true });
    };

    const onVisibility = () => {
      last = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);
    const start = window.setTimeout(() => {
      screen.appendChild(probe);
      frame = requestAnimationFrame(loop);
    }, 3000);
    return () => {
      window.clearTimeout(start);
      cancelAnimationFrame(frame);
      probe.remove();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);
}

const COARSE_POINTER = "(pointer: coarse)";

function isCoarsePointer(): boolean {
  return window.matchMedia(COARSE_POINTER).matches;
}

function subscribeCoarsePointer(onChange: () => void) {
  const query = window.matchMedia(COARSE_POINTER);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function noiseTile(): string {
  const canvas = document.createElement("canvas");
  canvas.width = NOISE_SIZE;
  canvas.height = NOISE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const image = ctx.createImageData(NOISE_SIZE, NOISE_SIZE);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.random() * 255;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

export function CrtOverlay() {
  const settings = useDisplaySettings();
  const linesRef = useRef<HTMLCanvasElement>(null);
  const noiseRef = useRef<HTMLDivElement>(null);
  const warpImageRef = useRef<SVGFEImageElement>(null);
  const radius = settings.tubeRadius;
  const coefficients = useMemo(() => warpCoefficients(radius), [radius]);
  const curvature = coefficients.horizontal;
  const showLines = settings.enabled && settings.scanlines;
  const lite = settings.lite;
  const showNoise = settings.enabled && settings.noise && !lite;
  usePerformanceGuard(settings.enabled && !lite);
  const rgbShift = (settings.rgbIntensity / 100) * MAX_RGB_SHIFT;
  const coarsePointer = useSyncExternalStore(subscribeCoarsePointer, isCoarsePointer, () => false);
  // Touch has no cursor to compensate the bent hit area, so keep the image flat there.
  const useWarp = settings.enabled && settings.warp && !coarsePointer && !lite;
  const useRgb = settings.enabled && settings.rgb && rgbShift > 0 && !lite;

  const [warpReadyFor, setWarpReadyFor] = useState<number | null>(null);
  const [warpHref, setWarpHref] = useState("");
  const [screenWidth, setScreenWidth] = useState(1024);

  useEffect(() => {
    const update = () => setScreenWidth(viewportSize().width || 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const warpReady = useWarp && warpReadyFor === radius;

  useEffect(() => {
    if (!useWarp) return;
    const url = warpMap(coefficients);
    const image = new Image();
    let cancelled = false;
    // Chrome paints the filter before feImage decodes and never repaints, so wait for the map.
    image.onload = () => {
      if (cancelled) return;
      warpImageRef.current?.setAttribute("href", url);
      setWarpHref(url);
      setWarpReadyFor(radius);
    };
    image.src = url;
    return () => {
      cancelled = true;
    };
  }, [useWarp, radius, coefficients]);

  useEffect(() => {
    const filters = [
      // One SVG pass instead of two: each filter re-rasterises the whole screen on every repaint.
      warpReady && useRgb ? "url(#crt-both)" : warpReady ? "url(#crt-warp)" : "",
      !warpReady && useRgb ? "url(#crt-rgb)" : "",
      settings.enabled ? SCREEN_TONE : "",
    ].filter(Boolean);
    const root = document.documentElement;
    root.style.setProperty("--crt-filter", filters.length ? filters.join(" ") : "none");  }, [warpReady, useRgb, settings.enabled]);

  useEffect(() => {
    const canvas = linesRef.current;
    if (!canvas || !showLines) return;
    drawScanlines(canvas, curvature);
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => drawScanlines(canvas, curvature));
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [showLines, curvature]);

  useEffect(() => {
    if (showNoise && noiseRef.current) {
      noiseRef.current.style.backgroundImage = `url(${noiseTile()})`;
    }
  }, [showNoise]);

  if (!settings.enabled) return null;

  const vars = {
    "--crt-scan-opacity": settings.scanlinesIntensity / 100,
    "--crt-noise-opacity": (settings.noiseIntensity / 100) * 0.2,
    "--crt-vignette-opacity": settings.vignetteIntensity / 100,
    "--crt-flash": (settings.flickerIntensity / 100) * 0.05,
    "--crt-dip": (settings.flickerIntensity / 100) * 0.16,
    "--crt-reflection-opacity": settings.reflectionIntensity / 100,
  } as CSSProperties;

  const classes = [
    "crt",
    settings.flicker ? "crt--flicker" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <svg className="crt__defs" aria-hidden="true" focusable="false">
        <filter
          id="crt-warp"
          x="0"
          y="0"
          width="1"
          height="1"
          primitiveUnits="objectBoundingBox"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            ref={warpImageRef}
            x="0"
            y="0"
            width="1"
            height="1"
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale={warpScale(coefficients)}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter
          id="crt-both"
          x="0"
          y="0"
          width="1"
          height="1"
          primitiveUnits="objectBoundingBox"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={warpHref || undefined}
            x="0"
            y="0"
            width="1"
            height="1"
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale={warpScale(coefficients)}
            xChannelSelector="R"
            yChannelSelector="G"
            result="bent"
          />
          <feColorMatrix
            in="bent"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="red"
          />
          {/* primitiveUnits is objectBoundingBox here, so the pixel shift becomes a width fraction. */}
          <feOffset in="red" dx={-rgbShift / screenWidth} dy="0" result="redShift" />
          <feColorMatrix
            in="bent"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="cyan"
          />
          <feOffset in="cyan" dx={rgbShift / screenWidth} dy="0" result="cyanShift" />
          <feBlend in="redShift" in2="cyanShift" mode="screen" />
        </filter>
        <filter id="crt-rgb" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="red"
          />
          <feOffset in="red" dx={-rgbShift} dy="0" result="redShift" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="cyan"
          />
          <feOffset in="cyan" dx={rgbShift} dy="0" result="cyanShift" />
          <feBlend in="redShift" in2="cyanShift" mode="screen" />
        </filter>
      </svg>
      <div className={classes} style={vars} aria-hidden="true">
        {warpReady ? <CrtCursor coefficients={coefficients} /> : null}
        {showLines ? (
          <canvas
            ref={linesRef}
            className={`crt__lines${settings.scanlinesScroll ? " crt__lines--scroll" : ""}`}
          />
        ) : null}
        {showNoise ? <div ref={noiseRef} className="crt__noise" /> : null}
        {settings.band && !lite ? <div className="crt__band" /> : null}
        {settings.vignette ? <div className="crt__vignette" /> : null}
        {settings.reflection ? <div className="crt__glass" /> : null}
      </div>
    </>
  );
}
