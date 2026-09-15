import { create } from "zustand";
import type { Camera, DrawElement, StyleDefaults, Tool } from "./types";
import { uid } from "./types";

const STORAGE_KEY = "dradraft:scene:v1";

interface BoardState {
  elements: DrawElement[];
  selection: string[];
  tool: Tool;
  camera: Camera;
  style: StyleDefaults;
  sceneName: string;
  editingId: string | null;
  theme: "light" | "dark";
  past: DrawElement[][];
  future: DrawElement[][];

  setTool: (t: Tool) => void;
  setCamera: (c: Partial<Camera>) => void;
  setSceneName: (n: string) => void;
  setEditing: (id: string | null) => void;
  toggleTheme: () => void;
  setStyle: (s: Partial<StyleDefaults>) => void;

  commit: () => void;
  undo: () => void;
  redo: () => void;

  addElement: (el: DrawElement) => void;
  updateElement: (id: string, patch: Partial<DrawElement>) => void;
  removeElement: (id: string) => void;
  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  moveSelected: (dx: number, dy: number) => void;
  selectAll: () => void;

  load: () => void;
  persist: () => void;
  clearAll: () => void;
  replaceAll: (els: DrawElement[]) => void;
}

const defaultStyle: StyleDefaults = {
  stroke: "#1a1917",
  fill: "transparent",
  strokeWidth: 2,
  opacity: 1,
  fontSize: 20,
};

function clone(elements: DrawElement[]): DrawElement[] {
  return JSON.parse(JSON.stringify(elements));
}

const THEME_KEY = "dradraft:theme";

function initialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const theme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  document.documentElement.classList.toggle("dark", theme === "dark");
  return theme;
}

export const useBoard = create<BoardState>((set, get) => ({
  elements: [],
  selection: [],
  tool: "select",
  camera: { x: 0, y: 0, zoom: 1 },
  style: defaultStyle,
  sceneName: "Untitled draft",
  editingId: null,
  theme: initialTheme(),
  past: [],
  future: [],

  setTool: (tool) => set({ tool, editingId: null }),
  setCamera: (c) => set((s) => ({ camera: { ...s.camera, ...c } })),
  setSceneName: (sceneName) => {
    set({ sceneName });
    get().persist();
  },
  setEditing: (editingId) => set({ editingId }),
  toggleTheme: () => {
    const theme = get().theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
  setStyle: (patch) => {
    const style = { ...get().style, ...patch };
    set({ style });
    // live-apply to selection
    const { selection, elements } = get();
    if (selection.length > 0) {
      get().commit();
      const next = elements.map((el) =>
        selection.includes(el.id)
          ? {
              ...el,
              stroke: style.stroke,
              fill: style.fill,
              strokeWidth: style.strokeWidth,
              opacity: style.opacity,
              fontSize: style.fontSize,
            }
          : el
      );
      set({ elements: next });
      get().persist();
    }
  },

  commit: () => {
    const { elements, past } = get();
    const next = [...past, clone(elements)].slice(-60);
    set({ past: next, future: [] });
  },
  undo: () => {
    const { past, future, elements } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      elements: prev,
      past: past.slice(0, -1),
      future: [clone(elements), ...future].slice(0, 60),
      selection: [],
      editingId: null,
    });
    get().persist();
  },
  redo: () => {
    const { past, future, elements } = get();
    if (future.length === 0) return;
    const [next, ...rest] = future;
    set({
      elements: next,
      past: [...past, clone(elements)].slice(-60),
      future: rest,
      selection: [],
      editingId: null,
    });
    get().persist();
  },

  addElement: (el) => {
    get().commit();
    set((s) => ({ elements: [...s.elements, el], selection: [el.id] }));
    get().persist();
  },
  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    })),
  removeElement: (id) => {
    get().commit();
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      selection: s.selection.filter((sid) => sid !== id),
    }));
    get().persist();
  },
  select: (ids, additive) =>
    set((s) => ({
      selection: additive ? Array.from(new Set([...s.selection, ...ids])) : ids,
    })),
  clearSelection: () => set({ selection: [] }),
  deleteSelected: () => {
    const { selection } = get();
    if (selection.length === 0) return;
    get().commit();
    set((s) => ({
      elements: s.elements.filter((e) => !selection.includes(e.id)),
      selection: [],
    }));
    get().persist();
  },
  duplicateSelected: () => {
    const { elements, selection } = get();
    if (selection.length === 0) return;
    get().commit();
    const copies = elements
      .filter((e) => selection.includes(e.id))
      .map((e) => ({ ...JSON.parse(JSON.stringify(e)), id: uid(), x: e.x + 16, y: e.y + 16 }));
    set((s) => ({
      elements: [...s.elements, ...copies],
      selection: copies.map((c) => c.id),
    }));
    get().persist();
  },
  bringForward: () => {
    const { elements, selection } = get();
    if (selection.length === 0) return;
    get().commit();
    const sel = elements.filter((e) => selection.includes(e.id));
    const rest = elements.filter((e) => !selection.includes(e.id));
    set({ elements: [...rest, ...sel] });
    get().persist();
  },
  sendBackward: () => {
    const { elements, selection } = get();
    if (selection.length === 0) return;
    get().commit();
    const sel = elements.filter((e) => selection.includes(e.id));
    const rest = elements.filter((e) => !selection.includes(e.id));
    set({ elements: [...sel, ...rest] });
    get().persist();
  },
  moveSelected: (dx, dy) =>
    set((s) => ({
      elements: s.elements.map((el) =>
        s.selection.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el
      ),
    })),
  selectAll: () => set((s) => ({ selection: s.elements.map((e) => e.id) })),

  load: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      set({
        elements: data.elements ?? [],
        sceneName: data.sceneName ?? "Untitled draft",
        camera: data.camera ?? { x: 0, y: 0, zoom: 1 },
      });
    } catch {
      /* ignore */
    }
  },
  persist: () => {
    try {
      const { elements, sceneName, camera } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements, sceneName, camera }));
    } catch {
      /* ignore */
    }
  },
  clearAll: () => {
    get().commit();
    set({ elements: [], selection: [], editingId: null });
    get().persist();
  },
  replaceAll: (elements) => {
    get().commit();
    set({ elements, selection: [] });
    get().persist();
  },
}));
