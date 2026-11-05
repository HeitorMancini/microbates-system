import type { ComponentType } from "react";
import type { VfsKind, VfsNode } from "@/content/types";

export type WindowMode = "normal" | "minimized" | "maximized";

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OsWindow = Bounds & {
  id: string;
  appId: string;
  fileId?: string;
  title: string;
  icon: string;
  zIndex: number;
  mode: WindowMode;
  restoreBounds: Bounds;
};

export type AppProps = {
  win: OsWindow;
  file?: VfsNode;
  isActive: boolean;
  isVisible: boolean;
  setFile: (fileId?: string) => void;
};

export type AppInstancing = "single" | "perFile" | "multi";

export type AppDefinition = {
  id: string;
  title: string;
  exe: string;
  icon: string;
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
  resizable?: boolean;
  instancing: AppInstancing;
  handles?: VfsKind[];
  formats?: string[];
  formatTitle?: (file: VfsNode) => string;
  showInStartMenu?: boolean;
  /** Groups the app under Iniciar > Programas > <folder>. */
  startMenuFolder?: string;
  /** Dialog box: centred, close button only. */
  dialog?: boolean;
  component: ComponentType<AppProps>;
};
