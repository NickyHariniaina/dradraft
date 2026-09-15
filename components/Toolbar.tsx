"use client";

import { useBoard } from "@/lib/store";
import type { Tool } from "@/lib/types";
import {
  ArrowRight,
  Circle,
  Diamond,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Type,
  type LucideIcon,
} from "lucide-react";

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: "select", label: "Select", key: "V" },
  { id: "hand", label: "Pan", key: "H" },
  { id: "rect", label: "Rectangle", key: "R" },
  { id: "ellipse", label: "Ellipse", key: "O" },
  { id: "diamond", label: "Diamond", key: "D" },
  { id: "arrow", label: "Arrow", key: "A" },
  { id: "line", label: "Line", key: "L" },
  { id: "pencil", label: "Draw", key: "P" },
  { id: "text", label: "Text", key: "T" },
  { id: "eraser", label: "Eraser", key: "E" },
];

const TOOL_ICONS: Record<Tool, LucideIcon> = {
  select: MousePointer2,
  hand: Hand,
  rect: Square,
  ellipse: Circle,
  diamond: Diamond,
  arrow: ArrowRight,
  line: Minus,
  pencil: Pencil,
  text: Type,
  eraser: Eraser,
};

export default function Toolbar() {
  const tool = useBoard((s) => s.tool);
  const setTool = useBoard((s) => s.setTool);
  return (
    <div className="float-bar flex items-center gap-0.5 rounded-2xl px-2 py-1.5">
      {TOOLS.map((t) => {
        const Icon = TOOL_ICONS[t.id];
        return (
          <button
            key={t.id}
            title={`${t.label} (${t.key})`}
            onClick={() => setTool(t.id)}
            className={`tool-btn flex h-9 w-9 items-center justify-center rounded-[10px] text-[17px] ${
              tool === t.id ? "active" : "text-[#1a1917]"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
