"use client";

import { useBoard } from "@/lib/store";
import type { Tool } from "@/lib/types";

const TOOLS: { id: Tool; label: string; key: string; icon: string }[] = [
  { id: "select", label: "Select", key: "V", icon: "↖" },
  { id: "hand", label: "Pan", key: "H", icon: "✋" },
  { id: "rect", label: "Rectangle", key: "R", icon: "▢" },
  { id: "ellipse", label: "Ellipse", key: "O", icon: "○" },
  { id: "diamond", label: "Diamond", key: "D", icon: "◇" },
  { id: "arrow", label: "Arrow", key: "A", icon: "→" },
  { id: "line", label: "Line", key: "L", icon: "—" },
  { id: "pencil", label: "Draw", key: "P", icon: "✎" },
  { id: "text", label: "Text", key: "T", icon: "T" },
  { id: "eraser", label: "Eraser", key: "E", icon: "⌫" },
];

export default function Toolbar() {
  const tool = useBoard((s) => s.tool);
  const setTool = useBoard((s) => s.setTool);
  return (
    <div className="float-bar flex items-center gap-0.5 rounded-2xl px-2 py-1.5">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          title={`${t.label} (${t.key})`}
          onClick={() => setTool(t.id)}
          className={`tool-btn flex h-9 w-9 items-center justify-center rounded-[10px] text-[17px] ${
            tool === t.id ? "active" : "text-[#1a1917]"
          }`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
