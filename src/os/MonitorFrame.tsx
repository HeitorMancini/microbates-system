"use client";

import type { ReactNode } from "react";
import { useDisplaySettings } from "@/os/displaySettings";

export function MonitorFrame({ children }: { children: ReactNode }) {
  const settings = useDisplaySettings();
  const framed = settings.enabled && settings.bezel;

  return (
    <div className={`monitor${framed ? " monitor--framed" : ""}`}>
      <div className="monitor__case">
        <div className="monitor__bezel">
          <div className="monitor__tube">{children}</div>
          {framed ? <span className="monitor__led" aria-hidden="true" /> : null}
        </div>
      </div>
    </div>
  );
}
