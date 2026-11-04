"use client";

import { useCallback, useRef, type PointerEvent } from "react";
import { getApp } from "@/apps/registry";
import { getNode } from "@/content/vfs";
import { useWindowManager } from "@/os/WindowManager";
import { uiScale } from "@/os/scale";
import type { OsWindow } from "@/os/types";

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
    moveWindow,
    resizeWindow,
    setWindowFile,
  } = useWindowManager();
  const drag = useRef<{ scale: number; offsetX: number; offsetY: number } | null>(null);
  const resize = useRef<{
    scale: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
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
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onTitlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const { scale, offsetX, offsetY } = drag.current;
    moveWindow(win.id, event.clientX / scale - offsetX, event.clientY / scale - offsetY);
  };

  const onTitlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
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
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onGripPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!resize.current) return;
    const { scale, startX, startY, width, height } = resize.current;
    resizeWindow(
      win.id,
      width + (event.clientX - startX) / scale,
      height + (event.clientY - startY) / scale,
    );
  };

  const onGripPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    resize.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const AppComponent = app?.component;

  return (
    <div
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
          if (resizable) maximizeWindow(win.id);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="os-window__icon" src={win.icon} alt="" width={16} height={16} />
        <div className="title-bar-text">{win.title}</div>
        <div className="title-bar-controls">
          <button
            type="button"
            aria-label="Minimize"
            onClick={(event) => {
              event.stopPropagation();
              minimizeWindow(win.id);
            }}
          />
          <button
            type="button"
            aria-label={maximized ? "Restore" : "Maximize"}
            disabled={!resizable}
            onClick={(event) => {
              event.stopPropagation();
              maximizeWindow(win.id);
            }}
          />
          <button
            type="button"
            aria-label="Close"
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
