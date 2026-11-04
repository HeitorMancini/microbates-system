type Base = {
  id: string;
  name: string;
  parentId: string | null;
  icon?: string;
  tags?: string[];
  createdAt?: string;
};

export type FolderNode = Base & { kind: "folder" };

export type DocBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
      width?: number;
      align?: "left" | "center" | "right";
    }
  | { type: "gallery"; images: { src: string; alt: string }[]; columns?: 2 | 3 | 4 }
  | { type: "quote"; text: string; author?: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "divider" };

export type DocumentFormat = "txt" | "rtf";

export type DocumentNode = Base & {
  kind: "document";
  format: DocumentFormat;
  blocks: DocBlock[];
};

export type VideoSource =
  | { provider: "youtube"; videoId: string }
  | { provider: "vimeo"; videoId: string }
  | { provider: "file"; src: string; poster?: string };

export type VideoNode = Base & {
  kind: "video";
  source: VideoSource;
  durationSec?: number;
  description?: string;
};

export type AudioNode = Base & {
  kind: "audio";
  src: string;
  durationSec?: number;
  loop?: boolean;
  bpm?: number;
  notes?: string;
};

export type LinkNode = Base & {
  kind: "link";
  url: string;
  description?: string;
  stack?: string[];
  repo?: string;
  embeddable?: boolean;
  preview?: string;
};

export type VfsNode = FolderNode | DocumentNode | VideoNode | AudioNode | LinkNode;

export type VfsKind = VfsNode["kind"];

export type ShortcutTarget = { appId: string } | { fileId: string };

export type DesktopShortcut = {
  label: string;
  target: ShortcutTarget;
  icon?: string;
};
