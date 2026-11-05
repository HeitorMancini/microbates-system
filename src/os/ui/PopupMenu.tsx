"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { MenuItem } from "./MenuBar";
import styles from "./ui.module.css";

type MenuListProps = {
  items: MenuItem[];
  /** Closes the whole menu tree; called after an item is chosen. */
  onClose: () => void;
  /** "start" draws the tall rows of the Start menu's first level. */
  variant?: "popup" | "start";
  /** Positioned beside its parent item instead of by the caller. */
  submenu?: boolean;
  autoFocus?: boolean;
  /** ArrowLeft / Escape inside a submenu hands focus back to the parent item. */
  onBack?: () => void;
};

function enabledButtons(list: HTMLUListElement): HTMLButtonElement[] {
  return Array.from(list.querySelectorAll<HTMLButtonElement>(":scope > li > button:not(:disabled)"));
}

export function MenuList({
  items,
  onClose,
  variant = "popup",
  submenu = false,
  autoFocus = false,
  onBack,
}: MenuListProps) {
  const ref = useRef<HTMLUListElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [focusSubmenu, setFocusSubmenu] = useState(false);

  useLayoutEffect(() => {
    const list = ref.current;
    const screen = document.querySelector<HTMLElement>(".desktop");
    if (!submenu || !list || !screen) return;
    const bounds = screen.getBoundingClientRect();
    const box = list.getBoundingClientRect();
    const k = screen.offsetWidth / (bounds.width || 1);
    if (box.right > bounds.right) {
      list.style.left = "auto";
      list.style.right = "calc(100% - 3px)";
    }
    const overflow = (box.bottom - bounds.bottom) * k;
    if (overflow > 0) list.style.top = `${-3 - overflow}px`;
  }, [submenu]);

  useEffect(() => {
    if (autoFocus && ref.current) enabledButtons(ref.current)[0]?.focus();
  }, [autoFocus]);

  const focusItem = (index: number) => {
    ref.current?.querySelector<HTMLButtonElement>(`:scope > li > button[data-index="${index}"]`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const list = ref.current;
    if (!list || (event.target as HTMLElement).closest("ul") !== list) return;
    const buttons = enabledButtons(list);
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const focused = current >= 0 ? buttons[current] : null;
    const index = focused ? Number(focused.dataset.index) : -1;
    const item = index >= 0 ? items[index] : undefined;

    switch (event.key) {
      case "ArrowDown":
        buttons[(current + 1) % buttons.length]?.focus();
        break;
      case "ArrowUp":
        buttons[(current - 1 + buttons.length) % buttons.length]?.focus();
        break;
      case "ArrowRight":
        if (item && item !== "separator" && item.items) {
          setFocusSubmenu(true);
          setOpenIndex(index);
        } else return;
        break;
      case "ArrowLeft":
        if (!onBack) return;
        onBack();
        break;
      case "Escape":
        if (onBack) onBack();
        else onClose();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <ul
      ref={ref}
      role="menu"
      className={`${variant === "start" ? styles.startList : styles.popupMenu}${submenu ? ` ${styles.submenu}` : ""}`}
      onKeyDown={onKeyDown}
    >
      {items.map((item, i) => {
        if (item === "separator") {
          return <li key={`sep-${i}`} className={styles.separator} role="separator" />;
        }
        const open = openIndex === i;
        return (
          <li
            key={item.label}
            className={styles.popupItemRoot}
            onPointerEnter={() => {
              setFocusSubmenu(false);
              setOpenIndex(item.items ? i : null);
            }}
          >
            <button
              type="button"
              role="menuitem"
              data-index={i}
              aria-haspopup={item.items ? "menu" : undefined}
              aria-expanded={item.items ? open : undefined}
              className={`${styles.popupItem}${open ? ` ${styles.popupItemOpen}` : ""}${
                item.bold ? ` ${styles.popupItemBold}` : ""
              }`}
              disabled={item.disabled || (!item.onSelect && !item.items)}
              onClick={() => {
                if (item.items) {
                  setOpenIndex(i);
                  return;
                }
                onClose();
                item.onSelect?.();
              }}
            >
              <span className={styles.popupIcon} aria-hidden="true">
                {item.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.icon} alt="" width={variant === "start" ? 24 : 16} height={variant === "start" ? 24 : 16} />
                ) : item.checked ? (
                  "\u2713"
                ) : null}
              </span>
              <span className={styles.popupLabel}>{item.label}</span>
              {item.items ? (
                <span className={styles.popupArrow} aria-hidden="true">
                  {"\u25B8"}
                </span>
              ) : null}
            </button>
            {item.items && open ? (
              <MenuList
                items={item.items}
                onClose={onClose}
                submenu
                autoFocus={focusSubmenu}
                onBack={() => {
                  setOpenIndex(null);
                  focusItem(i);
                }}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
