"use client";

import { APPS, getApp } from "@/apps/registry";
import { getChildren, iconForNode, ROOT_ID } from "@/content/vfs";
import { MenuList, type MenuItem } from "@/os/ui";
import { useWindowManager } from "@/os/WindowManager";

function documentItems(folderId: string, openFile: (fileId: string) => void): MenuItem[] {
  const children = getChildren(folderId);
  if (!children.length) return [{ label: "(Vazio)", disabled: true }];
  return children.map((node) =>
    node.kind === "folder"
      ? { label: node.name, icon: iconForNode(node), items: documentItems(node.id, openFile) }
      : { label: node.name, icon: iconForNode(node), onSelect: () => openFile(node.id) },
  );
}

function programItems(openApp: (appId: string) => void): MenuItem[] {
  const folders = new Map<string, MenuItem[]>();
  const loose: MenuItem[] = [];
  for (const app of APPS) {
    if (app.showInStartMenu === false) continue;
    const item: MenuItem = { label: app.title, icon: app.icon, onSelect: () => openApp(app.id) };
    if (!app.startMenuFolder) {
      loose.push(item);
      continue;
    }
    folders.set(app.startMenuFolder, [...(folders.get(app.startMenuFolder) ?? []), item]);
  }
  return [
    ...Array.from(folders, ([label, items]): MenuItem => ({ label, icon: "/icons/programs.svg", items })),
    ...loose,
  ];
}

export function StartMenu() {
  const { openApp, openFile, setStartMenuOpen } = useWindowManager();
  const controlPanel = getApp("control-panel");

  const items: MenuItem[] = [
    { label: "Programas", icon: "/icons/programs.svg", items: programItems(openApp) },
    { label: "Documentos", icon: "/icons/doc.svg", items: documentItems(ROOT_ID, openFile) },
    {
      label: "Configurações",
      icon: "/icons/control-panel.svg",
      items: [
        {
          label: controlPanel?.title ?? "Painel de Controle",
          icon: controlPanel?.icon,
          onSelect: () => openApp("control-panel"),
        },
      ],
    },
    { label: "Executar...", icon: "/icons/run.svg", onSelect: () => openApp("run") },
    "separator",
    { label: "Desligar...", icon: "/icons/shutdown.svg", onSelect: () => openApp("shutdown") },
  ];

  return (
    <div className="start-menu">
      <div className="start-menu__banner">MicroSystem</div>
      <MenuList items={items} variant="start" onClose={() => setStartMenuOpen(false)} />
    </div>
  );
}
