import type { VfsNode } from "@/content/types";
import {
  docToPlainText,
  getChildren,
  getNodesByKind,
  getPath,
  kindLabel,
  resolvePath,
  ROOT_ID,
} from "@/content/vfs";

export type CommandResult = {
  output: string[];
  cwd?: string;
  clear?: boolean;
  exit?: boolean;
  openFileId?: string;
};

export const BANNER = [
  "MicroSystem [Versão 4.10.1998]",
  "(C) Copyright Microbates Company 1998-2026.",
  "",
  "Digite HELP para ver os comandos disponíveis.",
  "",
];

const HELP = [
  "Comandos disponíveis:",
  "",
  "  HELP              Mostra esta ajuda",
  "  DIR [caminho]     Lista arquivos e pastas",
  "  CD [caminho]      Muda de pasta (CD .. volta um nível)",
  "  TYPE <arquivo>    Mostra o conteúdo de um documento",
  "  OPEN <arquivo>    Abre o arquivo no programa associado (alias: START)",
  "  PROJECTS          Lista projetos de engenharia e repositórios",
  "  CLS               Limpa a tela",
  "  VER               Versão do sistema",
  "  ECHO <texto>      Repete o texto",
  "  EXIT              Fecha o prompt",
];

function formatDate(iso?: string): string {
  if (!iso) return "          ";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function dirListing(folder: VfsNode): string[] {
  const children = getChildren(folder.id);
  const folders = children.filter((child) => child.kind === "folder").length;
  const lines = [
    " O volume na unidade C é MICROSYSTEM",
    ` Pasta de ${getPath(folder.id)}`,
    "",
    ...children.map((child) => {
      const tag = child.kind === "folder" ? "<DIR>     " : "          ";
      return `${formatDate(child.createdAt)}  ${tag}  ${child.name}`;
    }),
    `${String(children.length - folders).padStart(10)} arquivo(s)`,
    `${String(folders).padStart(10)} pasta(s)`,
  ];
  return lines;
}

function projectsListing(): string[] {
  const links = getNodesByKind("link");
  if (!links.length) return ["Nenhum projeto cadastrado."];
  return links.flatMap((link) => [
    link.name.toUpperCase(),
    ...(link.description ? [`  ${link.description}`] : []),
    ...(link.stack?.length ? [`  Stack: ${link.stack.join(", ")}`] : []),
    `  URL:   ${link.url}`,
    ...(link.repo ? [`  Repo:  ${link.repo}`] : []),
    "",
  ]);
}

function typeFile(node: VfsNode): string[] {
  switch (node.kind) {
    case "document":
      return docToPlainText(node.blocks).split("\n");
    case "link":
      return [node.url, ...(node.description ? [node.description] : [])];
    case "folder":
      return ["Acesso negado - é uma pasta."];
    default:
      return [`${kindLabel(node)}: arquivo binário. Use OPEN ${node.name}`];
  }
}

export function runCommand(raw: string, cwd: string): CommandResult {
  const input = raw.trim();
  if (!input) return { output: [] };

  const match = input.match(/^(cd\.\.|cd\\|\S+)\s*(.*)$/i);
  const name = (match?.[1] ?? input).toLowerCase();
  const arg = match?.[2] ?? "";
  const here = resolvePath(cwd, "") ?? resolvePath(ROOT_ID, "")!;

  switch (name) {
    case "help":
    case "?":
      return { output: HELP };
    case "cls":
      return { output: [], clear: true };
    case "ver":
      return { output: ["", "MicroSystem [Versão 4.10.1998]", ""] };
    case "echo":
      return { output: [arg] };
    case "exit":
      return { output: [], exit: true };
    case "projects":
      return { output: projectsListing() };
    case "dir": {
      const target = resolvePath(cwd, arg);
      if (!target || target.kind !== "folder") return { output: ["Arquivo não encontrado"] };
      return { output: dirListing(target) };
    }
    case "cd..":
      return { output: [], cwd: here.parentId ?? here.id };
    case "cd\\":
      return { output: [], cwd: ROOT_ID };
    case "cd":
    case "chdir": {
      if (!arg) return { output: [getPath(here.id)] };
      const target = resolvePath(cwd, arg);
      if (!target || target.kind !== "folder") return { output: ["Diretório inválido"] };
      return { output: [], cwd: target.id };
    }
    case "type": {
      if (!arg) return { output: ["Sintaxe: TYPE <arquivo>"] };
      const target = resolvePath(cwd, arg);
      if (!target) return { output: ["Arquivo não encontrado"] };
      return { output: typeFile(target) };
    }
    case "open":
    case "start": {
      if (!arg) return { output: [`Sintaxe: ${name.toUpperCase()} <arquivo>`] };
      const target = resolvePath(cwd, arg);
      if (!target) return { output: ["Arquivo não encontrado"] };
      return { output: [`Abrindo ${target.name}...`], openFileId: target.id };
    }
    default:
      return { output: ["Comando ou nome de arquivo inválido"] };
  }
}

export function completeName(cwd: string, partial: string): string | undefined {
  const lower = partial.toLowerCase();
  const hit = getChildren(cwd).find((child) => child.name.toLowerCase().startsWith(lower));
  return hit?.name;
}
