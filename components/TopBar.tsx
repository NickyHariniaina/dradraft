"use client";

import { useRef } from "react";
import { useBoard } from "@/lib/store";
import { sceneFromJSON } from "@/lib/export";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const theme = useBoard((s) => s.theme);
  const toggleTheme = useBoard((s) => s.toggleTheme);
  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="float-bar tool-btn flex h-10 w-10 items-center justify-center rounded-2xl"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

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
  const setSceneName = useBoard((s) => s.setSceneName);
  const replaceAll = useBoard((s) => s.replaceAll);
  const clearAll = useBoard((s) => s.clearAll);
  const undo = useBoard((s) => s.undo);
  const redo = useBoard((s) => s.redo);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="float-bar flex items-center gap-1 rounded-2xl px-2 py-1.5 text-[13px]">
      <button onClick={undo} className="tool-btn rounded-lg px-2 py-1" title="Undo (Ctrl+Z)">↩</button>
      <button onClick={redo} className="tool-btn rounded-lg px-2 py-1" title="Redo (Ctrl+Shift+Z)">↪</button>
      <div className="mx-1 h-4 w-px bg-black/10" />
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
