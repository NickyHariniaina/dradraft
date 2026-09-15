"use client";

import { useRef } from "react";
import { useBoard } from "@/lib/store";
import { sceneFromJSON, sceneToJSON, sceneToSVG } from "@/lib/export";
import { drawElement, applyCamera } from "@/lib/render";

export function SceneName() {
  const sceneName = useBoard((s) => s.sceneName);
  const setSceneName = useBoard((s) => s.setSceneName);
  return (
    <div className="float-bar flex items-center gap-2 rounded-2xl px-3 py-1.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a1917] font-serif text-[15px] italic text-[#f5f3ec]">
        d
      </div>
      <input
        value={sceneName}
        onChange={(e) => setSceneName(e.target.value)}
        className="w-36 bg-transparent text-center text-[13.5px] font-medium outline-none"
      />
    </div>
  );
}

export default function TopBar() {
  const elements = useBoard((s) => s.elements);
  const sceneName = useBoard((s) => s.sceneName);
  const setSceneName = useBoard((s) => s.setSceneName);
  const replaceAll = useBoard((s) => s.replaceAll);
  const clearAll = useBoard((s) => s.clearAll);
  const undo = useBoard((s) => s.undo);
  const redo = useBoard((s) => s.redo);
  const fileRef = useRef<HTMLInputElement>(null);

  function download(name: string, content: string | Blob, type: string) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPNG() {
    const off = document.createElement("canvas");
    const scale = 2;
    // compute bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      const pts = el.points?.map((p) => ({ x: el.x + p.x, y: el.y + p.y })) ?? [
        { x: el.x, y: el.y },
        { x: el.x + el.w, y: el.y + el.h },
      ];
      for (const p of pts) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
    const pad = 40;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    off.width = w * scale;
    off.height = h * scale;
    const ctx = off.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#f5f3ec";
    ctx.fillRect(0, 0, w, h);
    applyCamera(ctx, { x: -minX + pad, y: -minY + pad, zoom: 1 });
    for (const el of elements) drawElement(ctx, el);
    off.toBlob((b) => b && download(`${sceneName}.png`, b, "image/png"));
  }

  return (
    <div className="float-bar flex items-center gap-1 rounded-2xl px-2 py-1.5 text-[13px]">
      <button onClick={undo} className="tool-btn rounded-lg px-2 py-1" title="Undo (Ctrl+Z)">↩</button>
      <button onClick={redo} className="tool-btn rounded-lg px-2 py-1" title="Redo (Ctrl+Shift+Z)">↪</button>
      <div className="mx-1 h-4 w-px bg-black/10" />
      <button onClick={() => download(`${sceneName}.svg`, sceneToSVG(elements), "image/svg+xml")} className="tool-btn rounded-lg px-2 py-1 font-medium">SVG</button>
      <button onClick={exportPNG} className="tool-btn rounded-lg px-2 py-1 font-medium">PNG</button>
      <button onClick={() => download(`${sceneName}.json`, sceneToJSON(elements, sceneName), "application/json")} className="tool-btn rounded-lg px-2 py-1 font-medium">JSON</button>
      <button onClick={() => fileRef.current?.click()} className="tool-btn rounded-lg px-2 py-1 font-medium">Open</button>
      <button onClick={() => { if (confirm("Clear canvas?")) clearAll(); }} className="tool-btn rounded-lg px-2 py-1 text-[#c96442]" title="Clear">✕</button>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          f.text().then((t) => {
            try {
              const { elements: els, name } = sceneFromJSON(t);
              replaceAll(els);
              setSceneName(name);
            } catch {
              alert("Invalid scene file");
            }
          });
          e.target.value = "";
        }}
      />
    </div>
  );
}
