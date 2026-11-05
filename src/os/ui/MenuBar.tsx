"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ui.module.css";

export type MenuItem =
  | {
      label: string;
      onSelect?: () => void;
      disabled?: boolean;
      checked?: boolean;
      icon?: string;
      bold?: boolean;
      items?: MenuItem[];
    }
  | "separator";

export type Menu = { label: string; items: MenuItem[] };

function Accelerator({ label }: { label: string }) {
  return (
    <>
      <u>{label.charAt(0)}</u>
      {label.slice(1)}
    </>
  );
}

export function MenuBar({ menus }: { menus: Menu[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenIndex(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openIndex]);

  return (
    <div className={styles.menuBar} role="menubar" ref={rootRef}>
      {menus.map((menu, index) => {
        const open = openIndex === index;
        return (
          <div key={menu.label} className={styles.menuRoot}>
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={open}
              className={`${styles.menuButton}${open ? ` ${styles.menuButtonOpen}` : ""}`}
              onClick={() => setOpenIndex(open ? null : index)}
              onPointerEnter={() => {
                if (openIndex !== null) setOpenIndex(index);
              }}
            >
              <Accelerator label={menu.label} />
            </button>
            {open ? (
              <ul className={styles.dropdown} role="menu">
                {menu.items.map((item, i) =>
                  item === "separator" ? (
                    <li key={`sep-${i}`} className={styles.separator} role="separator" />
                  ) : (
                    <li key={item.label}>
                      <button
                        type="button"
                        role="menuitem"
                        className={`${styles.dropdownItem}${item.checked ? ` ${styles.checked}` : ""}`}
                        disabled={item.disabled || !item.onSelect}
                        onClick={() => {
                          setOpenIndex(null);
                          item.onSelect?.();
                        }}
                      >
                        {item.label}
                      </button>
                    </li>
                  ),
                )}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
