import { getApp } from "@/apps/registry";
import type { MenuItem } from "@/os/ui";
import type { OsWindow } from "@/os/types";

type WindowActions = {
  restoreWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  closeWindow: (id: string) => void;
};

/** The system menu shared by the title bar and the taskbar button. */
export function windowMenuItems(win: OsWindow, actions: WindowActions): MenuItem[] {
  const app = getApp(win.appId);
  const dialog = app?.dialog === true;
  const resizable = app?.resizable !== false;
  return [
    {
      label: "Restaurar",
      disabled: win.mode === "normal",
      onSelect: () => actions.restoreWindow(win.id),
    },
    {
      label: "Minimizar",
      disabled: dialog || win.mode === "minimized",
      onSelect: () => actions.minimizeWindow(win.id),
    },
    {
      label: "Maximizar",
      disabled: dialog || !resizable || win.mode === "maximized",
      onSelect: () => actions.maximizeWindow(win.id),
    },
    "separator",
    { label: "Fechar", bold: true, onSelect: () => actions.closeWindow(win.id) },
  ];
}
