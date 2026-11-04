"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import styles from "./InternetExplorer.module.css";

export function PageScaler({ width, children }: { width: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setBox({ width: w, height: h });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = box.width ? box.width / width : 0;

  return (
    <div ref={outer} className={styles.scaler}>
      {scale ? (
        <div
          className={styles.scalerPage}
          style={{
            width,
            height: box.height / scale,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
