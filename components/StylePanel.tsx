"use client";

import { useBoard } from "@/lib/store";
import { INK_SWATCHES, type FillStyle } from "@/lib/types";

export default function StylePanel() {
  const selection = useBoard((s) => s.selection);
  const style = useBoard((s) => s.style);
  const setStyle = useBoard((s) => s.setStyle);
  const del = useBoard((s) => s.deleteSelected);
  const dup = useBoard((s) => s.duplicateSelected);
  const fwd = useBoard((s) => s.bringForward);
  const bwd = useBoard((s) => s.sendBackward);

  if (selection.length === 0) return null;

  const fills: FillStyle[] = ["transparent", "solid", "hatch"];

  return (
    <div className="float-bar w-56 rounded-2xl p-4 text-[13px]">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-black/50">
        {selection.length} selected
      </p>
      <p className="mb-1 font-medium">Stroke</p>
      <div className="mb-3 flex items-center gap-1.5">
        {INK_SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => setStyle({ stroke: c })}
            className={`h-6 w-6 rounded-full border ${style.stroke === c ? "ring-2 ring-[#c96442] ring-offset-2" : "border-black/15"}`}
            style={{ background: c }}
          />
        ))}
        <input
          type="color"
          value={style.stroke}
          onChange={(e) => setStyle({ stroke: e.target.value })}
          title="Custom color"
          className="h-6 w-8 cursor-pointer rounded border border-black/15 bg-transparent p-0.5"
        />
      </div>
      <p className="mb-1 font-medium">Fill</p>
      <div className="mb-3 flex gap-1">
        {fills.map((f) => (
          <button
            key={f}
            onClick={() => setStyle({ fill: f })}
            className={`rounded-lg border px-2 py-1 capitalize ${style.fill === f ? "border-[#1a1917] bg-[#1a1917] text-white" : "border-black/15"}`}
          >
            {f === "transparent" ? "None" : f}
          </button>
        ))}
      </div>
      <p className="mb-1 font-medium">Width</p>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={24}
          value={style.strokeWidth}
          onChange={(e) => setStyle({ strokeWidth: Math.min(24, Math.max(1, Number(e.target.value) || 1)) })}
          className="w-16 rounded-lg border border-black/15 bg-transparent px-2 py-1 outline-none"
        />
        <span className="text-black/50">px</span>
      </div>
      <p className="mb-1 font-medium">Opacity — {Math.round(style.opacity * 100)}%</p>
      <input
        type="range"
        min={0.1}
        max={1}
        step={0.05}
        value={style.opacity}
        onChange={(e) => setStyle({ opacity: Number(e.target.value) })}
        className="mb-3 w-full accent-[#c96442]"
      />
      <p className="mb-1 font-medium">Text size</p>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="number"
          min={8}
          max={120}
          value={style.fontSize}
          onChange={(e) => setStyle({ fontSize: Math.min(120, Math.max(8, Number(e.target.value) || 8)) })}
          className="w-16 rounded-lg border border-black/15 bg-transparent px-2 py-1 outline-none"
        />
        <span className="text-black/50">px</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={dup} className="rounded-lg border border-black/15 px-2 py-1.5 font-medium hover:bg-black/5">Duplicate</button>
        <button onClick={del} className="rounded-lg border border-[#c96442]/40 px-2 py-1.5 font-medium text-[#c96442] hover:bg-[#c96442]/10">Delete</button>
        <button onClick={fwd} className="rounded-lg border border-black/15 px-2 py-1.5 hover:bg-black/5">Forward</button>
        <button onClick={bwd} className="rounded-lg border border-black/15 px-2 py-1.5 hover:bg-black/5">Backward</button>
      </div>
    </div>
  );
}
