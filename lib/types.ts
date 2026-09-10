export type Tool =
  | "select"
  | "hand"
  | "rect"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "pencil"
  | "text"
  | "eraser";

export type ElementType =
  | "rect"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "pencil"
  | "text";

export type FillStyle = "transparent" | "solid" | "hatch";

export interface DrawElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // reserved for later, always 0 in v1
  points?: { x: number; y: number }[]; // local coords for line/arrow/pencil
  text?: string;
  fontSize?: number;
  stroke: string;
  fill: FillStyle;
  strokeWidth: number;
  opacity: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface StyleDefaults {
  stroke: string;
  fill: FillStyle;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
}

export const INK_SWATCHES = [
  "#1a1917",
  "#57534a",
  "#c96442",
  "#2f6f4e",
  "#2b5d9b",
  "#7c3aed",
];

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}
