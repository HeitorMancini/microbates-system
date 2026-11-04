import dynamic from "next/dynamic";
import type { VfsNode } from "@/content/types";
import { getPath } from "@/content/vfs";
import type { AppDefinition, AppProps } from "@/os/types";

const Explorer = dynamic<AppProps>(() => import("./explorer/Explorer").then((m) => m.Explorer));
const WordPad = dynamic<AppProps>(() => import("./wordpad/DocumentViewer").then((m) => m.WordPad));
const Notepad = dynamic<AppProps>(() => import("./wordpad/DocumentViewer").then((m) => m.Notepad));
const Terminal = dynamic<AppProps>(() => import("./terminal/Terminal").then((m) => m.Terminal));
const SoundRecorder = dynamic<AppProps>(() =>
  import("./sound-recorder/SoundRecorder").then((m) => m.SoundRecorder),
);
const VideoPlayer = dynamic<AppProps>(() =>
  import("./video-player/VideoPlayer").then((m) => m.VideoPlayer),
);
const ControlPanel = dynamic<AppProps>(() =>
  import("./control-panel/ControlPanel").then((m) => m.ControlPanel),
);
const InternetExplorer = dynamic<AppProps>(() =>
  import("./internet-explorer/InternetExplorer").then((m) => m.InternetExplorer),
);

export const APPS: AppDefinition[] = [
  {
    id: "explorer",
    title: "Meu Computador",
    exe: "EXPLORER.EXE",
    icon: "/icons/computer.svg",
    defaultSize: { width: 520, height: 360 },
    minSize: { width: 300, height: 200 },
    resizable: true,
    instancing: "multi",
    handles: ["folder"],
    formatTitle: (file) => getPath(file.id),
    component: Explorer,
  },
  {
    id: "video-player",
    title: "Media Player",
    exe: "MPLAYER2.EXE",
    icon: "/icons/media-player.svg",
    defaultSize: { width: 560, height: 440 },
    minSize: { width: 320, height: 280 },
    resizable: true,
    instancing: "perFile",
    handles: ["video"],
    component: VideoPlayer,
  },
  {
    id: "wordpad",
    title: "WordPad",
    exe: "WORDPAD.EXE",
    icon: "/icons/wordpad.svg",
    defaultSize: { width: 600, height: 460 },
    minSize: { width: 320, height: 240 },
    resizable: true,
    instancing: "perFile",
    handles: ["document"],
    formats: ["rtf"],
    component: WordPad,
  },
  {
    id: "notepad",
    title: "Bloco de Notas",
    exe: "NOTEPAD.EXE",
    icon: "/icons/notepad.svg",
    defaultSize: { width: 460, height: 340 },
    minSize: { width: 240, height: 160 },
    resizable: true,
    instancing: "perFile",
    handles: ["document"],
    formats: ["txt"],
    component: Notepad,
  },
  {
    id: "sound-recorder",
    title: "Gravador de Som",
    exe: "SNDREC32.EXE",
    icon: "/icons/sound-recorder.svg",
    defaultSize: { width: 340, height: 196 },
    resizable: false,
    instancing: "single",
    handles: ["audio"],
    component: SoundRecorder,
  },
  {
    id: "terminal",
    title: "Prompt do MS-DOS",
    exe: "COMMAND.COM",
    icon: "/icons/terminal.svg",
    defaultSize: { width: 580, height: 360 },
    minSize: { width: 300, height: 180 },
    resizable: true,
    instancing: "single",
    formatTitle: () => "Prompt do MS-DOS",
    component: Terminal,
  },
  {
    id: "control-panel",
    title: "Painel de Controle",
    exe: "CONTROL.EXE",
    icon: "/icons/control-panel.svg",
    defaultSize: { width: 400, height: 470 },
    minSize: { width: 340, height: 300 },
    resizable: true,
    instancing: "single",
    formatTitle: () => "Painel de Controle",
    component: ControlPanel,
  },
  {
    id: "internet-explorer",
    title: "Internet Explorer",
    exe: "IEXPLORE.EXE",
    icon: "/icons/ie.svg",
    defaultSize: { width: 640, height: 500 },
    minSize: { width: 360, height: 280 },
    resizable: true,
    instancing: "perFile",
    handles: ["link"],
    formatTitle: (file) => `${file.name} - Microsoft Internet Explorer`,
    component: InternetExplorer,
  },
];

export function getApp(appId: string): AppDefinition | undefined {
  return APPS.find((app) => app.id === appId);
}

export function resolveAppForNode(node: VfsNode): AppDefinition | undefined {
  return APPS.find((app) => {
    if (!app.handles?.includes(node.kind)) return false;
    if (node.kind === "document" && app.formats) return app.formats.includes(node.format);
    return true;
  });
}

export function windowTitle(app: AppDefinition, file?: VfsNode): string {
  if (!file) return app.title;
  if (app.formatTitle) return app.formatTitle(file);
  return `${file.name} - ${app.title}`;
}
