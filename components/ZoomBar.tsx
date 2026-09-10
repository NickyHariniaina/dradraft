"use client";

import { useBoard } from "@/lib/store";

export default function ZoomBar() {
  const camera = useBoard((s) => s.camera);
  const setCamera = useBoard((s) => s.setCamera);
  const pct = Math.round(camera.zoom * 100);

  function zoomBy(f: number) {
    const zoom = Math.min(4, Math.max(0.1, camera.zoom * f));
    setCamera({ zoom });
  }

  return (
    <div className="float-bar flex items-center gap-1 rounded-2xl px-2 py-1.5 text-[13px]">
      <button onClick={() => zoomBy(0.8)} className="tool-btn rounded-lg px-2 py-1">−</button>
      <button
        onClick={() => setCamera({ zoom: 1, x: 0, y: 0 })}
        className="min-w-12 rounded-lg px-1 py-1 text-center font-medium tabular-nums"
        title="Reset to 100%"
      >
        {pct}%
      </button>
      <button onClick={() => zoomBy(1.25)} className="tool-btn rounded-lg px-2 py-1">+</button>
    </div>
  );
}
