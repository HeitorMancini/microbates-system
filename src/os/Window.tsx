"use client";

import { useCallback, useRef, type PointerEvent } from "react";
import { getApp } from "@/apps/registry";
import { getNode } from "@/content/vfs";
import { clampMove, clampResize, useWindowManager } from "@/os/WindowManager";
import { uiScale } from "@/os/scale";
import type { OsWindow } from "@/os/types";
import { usePopups } from "@/os/ui";
import { windowMenuItems } from "@/os/windowMenu";

type WindowFrameProps = {
  win: OsWindow;
};

export function WindowFrame({ win }: WindowFrameProps) {
  const {
    focusedId,
    focusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    moveWindow,
    resizeWindow,
    setWindowFile,
  } = useWindowManager();
  const { openContextMenu, tooltip } = usePopups();
  // Drag and resize write straight to the DOM and commit on release, so a pointermove
  // never re-renders every window.
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    scale: number;
    offsetX: number;
    offsetY: number;
    x: number;
    y: number;
  } | null>(null);
  const resize = useRef<{
    scale: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
    nextWidth: number;
    nextHeight: number;
  } | null>(null);
  const app = getApp(win.appId);
  const visible = win.mode !== "minimized";
  const active = focusedId === win.id && visible;
  const maximized = win.mode === "maximized";
  const resizable = app?.resizable !== false;

  const setFile = useCallback(
    (fileId?: string) => setWindowFile(win.id, fileId),
    [setWindowFile, win.id],
  );

  const onTitlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;

    focusWindow(win.id);

    if (maximized) return;

    const scale = uiScale();
    drag.current = {
      scale,
      offsetX: event.clientX / scale - win.x,
      offsetY: event.clientY / scale - win.y,
      x: win.x,
      y: win.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onTitlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    const frame = frameRef.current;
    if (!current || !frame) return;
    const next = clampMove(
      win,
      event.clientX / current.scale - current.offsetX,
      event.clientY / current.scale - current.offsetY,
    );
    current.x = next.x;
    current.y = next.y;
    frame.style.transform = `translate(${next.x - win.x}px, ${next.y - win.y}px)`;
  };

  const onTitlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    drag.current = null;
    if (current) {
      if (frameRef.current) frameRef.current.style.transform = "";
      if (current.x !== win.x || current.y !== win.y) moveWindow(win.id, current.x, current.y);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onGripPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    focusWindow(win.id);
    resize.current = {
      scale: uiScale(),
      startX: event.clientX,
      startY: event.clientY,
      width: win.width,
      height: win.height,
      nextWidth: win.width,
      nextHeight: win.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onGripPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = resize.current;
    const frame = frameRef.current;
    if (!current || !frame) return;
    const next = clampResize(
      win,
      current.width + (event.clientX - current.startX) / current.scale,
      current.height + (event.clientY - current.startY) / current.scale,
    );
    current.nextWidth = next.width;
    current.nextHeight = next.height;
    frame.style.width = `${next.width}px`;
    frame.style.height = `${next.height}px`;
  };

  const onGripPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = resize.current;
    resize.current = null;
    if (current) {
      if (current.nextWidth !== win.width || current.nextHeight !== win.height) {
        resizeWindow(win.id, current.nextWidth, current.nextHeight);
      }
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const AppComponent = app?.component;

  return (
    <div
      ref={frameRef}
      className={`window os-window${maximized ? " os-window--maximized" : ""}`}
      role="dialog"
      aria-label={win.title}
      hidden={!visible}
      style={
        maximized
          ? { zIndex: win.zIndex }
          : {
              left: win.x,
              top: win.y,
              width: win.width,
              height: win.height,
              zIndex: win.zIndex,
            }
      }
      onPointerDown={() => {
        if (!active) focusWindow(win.id);
      }}
    >
      <div
        className={`title-bar${active ? "" : " inactive"}`}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onPointerCancel={onTitlePointerUp}
        onDoubleClick={() => {
          if (resizable && !app?.dialog) maximizeWindow(win.id);
        }}
        onContextMenu={(event) => {
          focusWindow(win.id);
          openContextMenu(
            event,
            windowMenuItems(win, { restoreWindow, minimizeWindow, maximizeWindow, closeWindow }),
          );
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="os-window__icon" src={win.icon} alt="" width={16} height={16} />
        <div className="title-bar-text">{win.title}</div>
        <div className="title-bar-controls">
          {app?.dialog ? null : (
            <>
              <button
                type="button"
                aria-label="Minimize"
                {...tooltip("Minimizar")}
                onClick={(event) => {
                  event.stopPropagation();
                  minimizeWindow(win.id);
                }}
              />
              <button
                type="button"
                aria-label={maximized ? "Restore" : "Maximize"}
                {...tooltip(maximized ? "Restaurar" : "Maximizar")}
                disabled={!resizable}
                onClick={(event) => {
                  event.stopPropagation();
                  maximizeWindow(win.id);
                }}
              />
            </>
          )}
          <button
            type="button"
            aria-label="Close"
            {...tooltip("Fechar")}
            onClick={(event) => {
              event.stopPropagation();
              closeWindow(win.id);
            }}
          />
        </div>
      </div>
      <div className="os-window__body">
        {AppComponent ? (
          <AppComponent
            win={win}
            file={getNode(win.fileId)}
            isActive={active}
            isVisible={visible}
            setFile={setFile}
          />
        ) : (
          <p className="os-window__error">Programa não encontrado.</p>
        )}
      </div>
      {resizable && !maximized ? (
        <div
          className="os-window__grip"
          aria-hidden="true"
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={onGripPointerUp}
          onPointerCancel={onGripPointerUp}
        />
      ) : null}
    </div>
  );
}
