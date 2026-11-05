"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { getApp, resolveAppForNode, windowTitle } from "@/apps/registry";
import { getNode } from "@/content/vfs";
import { viewportSize } from "@/os/scale";
import type { AppDefinition, Bounds, OsWindow } from "@/os/types";

const TASKBAR_HEIGHT = 32;
const CASCADE_OFFSET = 28;
const DEFAULT_MIN_SIZE = { width: 220, height: 120 };

type OsState = {
  windows: OsWindow[];
  focusedId: string | null;
  nextZ: number;
  startMenuOpen: boolean;
};

type OsAction =
  | { type: "open"; appId: string; fileId?: string }
  | { type: "setFile"; id: string; fileId?: string }
  | { type: "resize"; id: string; width: number; height: number }
  | { type: "close"; id: string }
  | { type: "focus"; id: string }
  | { type: "minimize"; id: string }
  | { type: "maximize"; id: string }
  | { type: "restore"; id: string }
  | { type: "toggleTaskbar"; id: string }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "setStartMenu"; open: boolean };

function clampPosition(x: number, y: number, width: number, height: number): Bounds {
  if (typeof window === "undefined") {
    return { x, y, width, height };
  }

  const viewport = viewportSize();
  const maxX = Math.max(0, viewport.width - 80);
  const maxY = Math.max(0, viewport.height - TASKBAR_HEIGHT - 28);
  return {
    x: Math.min(Math.max(-width + 80, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
    width,
    height,
  };
}

function desktopSize(): { width: number; height: number } {
  const viewport = viewportSize();
  return {
    width: viewport.width,
    height: viewport.height - TASKBAR_HEIGHT,
  };
}

export function clampMove(win: OsWindow, x: number, y: number): { x: number; y: number } {
  const next = clampPosition(x, y, win.width, win.height);
  return { x: next.x, y: next.y };
}

export function clampResize(
  win: OsWindow,
  width: number,
  height: number,
): { width: number; height: number } {
  const min = getApp(win.appId)?.minSize ?? DEFAULT_MIN_SIZE;
  const desk = desktopSize();
  return {
    width: Math.min(Math.max(min.width, width), desk.width - win.x),
    height: Math.min(Math.max(min.height, height), desk.height - win.y),
  };
}

function cascadeOrigin(count: number): { x: number; y: number } {
  const col = count % 8;
  return { x: 60 + col * CASCADE_OFFSET, y: 40 + col * CASCADE_OFFSET };
}

function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

function findExisting(
  windows: OsWindow[],
  app: AppDefinition,
  fileId: string | undefined,
): OsWindow | undefined {
  switch (app.instancing) {
    case "single":
      return windows.find((win) => win.appId === app.id);
    case "perFile":
      return windows.find(
        (win) => win.appId === app.id && (fileId === undefined || win.fileId === fileId),
      );
    case "multi":
      return undefined;
  }
}

function osReducer(state: OsState, action: OsAction): OsState {
  switch (action.type) {
    case "setStartMenu":
      return { ...state, startMenuOpen: action.open };
    case "open": {
      const app = getApp(action.appId);
      if (!app) return state;
      const file = getNode(action.fileId);

      const existing = findExisting(state.windows, app, action.fileId);
      if (existing) {
        const nextZ = state.nextZ + 1;
        const swapFile = file && existing.fileId !== file.id;
        return {
          ...state,
          startMenuOpen: false,
          focusedId: existing.id,
          nextZ,
          windows: state.windows.map((win) =>
            win.id === existing.id
              ? {
                  ...win,
                  ...(swapFile ? { fileId: file.id, title: windowTitle(app, file) } : {}),
                  mode: win.mode === "minimized" ? "normal" : win.mode,
                  zIndex: nextZ,
                }
              : win,
          ),
        };
      }

      const origin = cascadeOrigin(state.windows.length);
      const nextZ = state.nextZ + 1;
      const id = `${app.id}-${nextZ}`;
      const desk = desktopSize();
      const width = Math.min(app.defaultSize.width, desk.width);
      const height = Math.min(app.defaultSize.height, desk.height);
      const bounds = clampPosition(
        Math.max(0, Math.min(origin.x, desk.width - width)),
        Math.max(0, Math.min(origin.y, desk.height - height)),
        width,
        height,
      );
      const maximize = isCoarsePointer() && app.resizable !== false;
      const win: OsWindow = {
        id,
        appId: app.id,
        fileId: file?.id,
        title: windowTitle(app, file),
        icon: app.icon,
        zIndex: nextZ,
        mode: maximize ? "maximized" : "normal",
        restoreBounds: bounds,
        ...bounds,
        ...(maximize ? { x: 0, y: 0, ...desktopSize() } : {}),
      };

      return {
        ...state,
        startMenuOpen: false,
        focusedId: id,
        nextZ,
        windows: [...state.windows, win],
      };
    }
    case "close": {
      const windows = state.windows.filter((win) => win.id !== action.id);
      const top = windows.reduce<OsWindow | null>(
        (acc, win) => {
          if (win.mode === "minimized") return acc;
          if (!acc || win.zIndex > acc.zIndex) return win;
          return acc;
        },
        null,
      );
      return {
        ...state,
        windows,
        focusedId: state.focusedId === action.id ? (top?.id ?? null) : state.focusedId,
      };
    }
    case "focus": {
      const target = state.windows.find((win) => win.id === action.id);
      if (!target) return state;
      const nextZ = state.nextZ + 1;
      return {
        ...state,
        startMenuOpen: false,
        focusedId: action.id,
        nextZ,
        windows: state.windows.map((win) =>
          win.id === action.id ? { ...win, zIndex: nextZ } : win,
        ),
      };
    }
    case "minimize": {
      const remaining = state.windows.filter(
        (win) => win.id !== action.id && win.mode !== "minimized",
      );
      const top = remaining.reduce<OsWindow | null>(
        (acc, win) => (!acc || win.zIndex > acc.zIndex ? win : acc),
        null,
      );
      return {
        ...state,
        focusedId: state.focusedId === action.id ? (top?.id ?? null) : state.focusedId,
        windows: state.windows.map((win) =>
          win.id === action.id ? { ...win, mode: "minimized" } : win,
        ),
      };
    }
    case "maximize": {
      const nextZ = state.nextZ + 1;
      const desk = desktopSize();
      return {
        ...state,
        startMenuOpen: false,
        focusedId: action.id,
        nextZ,
        windows: state.windows.map((win) => {
          if (win.id !== action.id) return win;
          if (win.mode === "maximized") {
            return {
              ...win,
              ...win.restoreBounds,
              mode: "normal",
              zIndex: nextZ,
            };
          }
          return {
            ...win,
            restoreBounds: { x: win.x, y: win.y, width: win.width, height: win.height },
            x: 0,
            y: 0,
            width: desk.width,
            height: desk.height,
            mode: "maximized",
            zIndex: nextZ,
          };
        }),
      };
    }
    case "restore": {
      const nextZ = state.nextZ + 1;
      return {
        ...state,
        startMenuOpen: false,
        focusedId: action.id,
        nextZ,
        windows: state.windows.map((win) =>
          win.id === action.id
            ? {
                ...win,
                mode: "normal",
                zIndex: nextZ,
                ...(win.mode === "maximized" ? win.restoreBounds : {}),
              }
            : win,
        ),
      };
    }
    case "toggleTaskbar": {
      const target = state.windows.find((win) => win.id === action.id);
      if (!target) return state;
      const next =
        target.mode === "minimized" || state.focusedId !== target.id
          ? osReducer(state, { type: "restore", id: action.id })
          : osReducer(state, { type: "minimize", id: action.id });
      return { ...next, startMenuOpen: false };
    }
    case "move": {
      return {
        ...state,
        windows: state.windows.map((win) => {
          if (win.id !== action.id || win.mode === "maximized") return win;
          const next = clampMove(win, action.x, action.y);
          return {
            ...win,
            x: next.x,
            y: next.y,
            restoreBounds: { ...win.restoreBounds, x: next.x, y: next.y },
          };
        }),
      };
    }
    case "resize": {
      return {
        ...state,
        windows: state.windows.map((win) => {
          if (win.id !== action.id || win.mode === "maximized") return win;
          const { width, height } = clampResize(win, action.width, action.height);
          return {
            ...win,
            width,
            height,
            restoreBounds: { ...win.restoreBounds, width, height },
          };
        }),
      };
    }
    case "setFile": {
      const file = getNode(action.fileId);
      if (action.fileId && !file) return state;
      return {
        ...state,
        windows: state.windows.map((win) => {
          if (win.id !== action.id) return win;
          const app = getApp(win.appId);
          return {
            ...win,
            fileId: file?.id,
            title: app ? windowTitle(app, file) : win.title,
          };
        }),
      };
    }
    default:
      return state;
  }
}

const initialState: OsState = {
  windows: [],
  focusedId: null,
  nextZ: 1,
  startMenuOpen: false,
};

type WindowManagerValue = OsState & {
  openApp: (appId: string, fileId?: string) => void;
  openFile: (fileId: string) => void;
  setWindowFile: (id: string, fileId?: string) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleTaskbarWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  setStartMenuOpen: (open: boolean) => void;
};

const WindowManagerContext = createContext<WindowManagerValue | null>(null);

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(osReducer, initialState);

  const openApp = useCallback((appId: string, fileId?: string) => {
    dispatch({ type: "open", appId, fileId });
  }, []);
  const openFile = useCallback((fileId: string) => {
    const node = getNode(fileId);
    if (!node) return;
    const app = resolveAppForNode(node);
    if (app) dispatch({ type: "open", appId: app.id, fileId });
  }, []);
  const setWindowFile = useCallback((id: string, fileId?: string) => {
    dispatch({ type: "setFile", id, fileId });
  }, []);
  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    dispatch({ type: "resize", id, width, height });
  }, []);
  const closeWindow = useCallback((id: string) => {
    dispatch({ type: "close", id });
  }, []);
  const focusWindow = useCallback((id: string) => {
    dispatch({ type: "focus", id });
  }, []);
  const minimizeWindow = useCallback((id: string) => {
    dispatch({ type: "minimize", id });
  }, []);
  const maximizeWindow = useCallback((id: string) => {
    dispatch({ type: "maximize", id });
  }, []);
  const restoreWindow = useCallback((id: string) => {
    dispatch({ type: "restore", id });
  }, []);
  const toggleTaskbarWindow = useCallback((id: string) => {
    dispatch({ type: "toggleTaskbar", id });
  }, []);
  const moveWindow = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: "move", id, x, y });
  }, []);
  const setStartMenuOpen = useCallback((open: boolean) => {
    dispatch({ type: "setStartMenu", open });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      openApp,
      openFile,
      setWindowFile,
      resizeWindow,
      closeWindow,
      focusWindow,
      minimizeWindow,
      maximizeWindow,
      restoreWindow,
      toggleTaskbarWindow,
      moveWindow,
      setStartMenuOpen,
    }),
    [
      state,
      openApp,
      openFile,
      setWindowFile,
      resizeWindow,
      closeWindow,
      focusWindow,
      minimizeWindow,
      maximizeWindow,
      restoreWindow,
      toggleTaskbarWindow,
      moveWindow,
      setStartMenuOpen,
    ],
  );

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager(): WindowManagerValue {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) {
    throw new Error("useWindowManager must be used within WindowManagerProvider");
  }
  return ctx;
}

export { TASKBAR_HEIGHT };
