"use client";

import { useEffect, useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import type { DrawElement, Tool } from "@/lib/types";
import { uid } from "@/lib/types";
import {
  boundsOf,
  handlePositions,
  hitTest,
  normalizeRect,
  resizeBounds,
  screenToWorld,
  simplifyPoints,
  worldToScreen,
  type HandleId,
} from "@/lib/geometry";
import { applyCamera, drawElement, drawGrid, drawMarquee, drawSelection } from "@/lib/render";

type Mode =
  | "idle"
  | "drawing"
  | "moving"
  | "resizing"
  | "marquee"
  | "panning"
  | "pencil";

interface Interaction {
  mode: Mode;
  startWX: number;
  startWY: number;
  origCamX: number;
  origCamY: number;
  lastSX: number;
  lastSY: number;
  handle: HandleId | null;
  origEl: DrawElement | null;
  origBounds: { x: number; y: number; w: number; h: number } | null;
  origPositions: Map<string, { x: number; y: number }>;
  moved: boolean;
}

const SHORTCUT: Record<string, Tool> = {
  v: "select", h: "hand", r: "rect", o: "ellipse", d: "diamond",
  l: "line", a: "arrow", p: "pencil", t: "text", e: "eraser",
};

function measureText(text: string, fontSize: number): { w: number; h: number } {
  const c = document.createElement("canvas").getContext("2d")!;
  c.font = `${fontSize}px Inter, sans-serif`;
  const lines = text.split("\n");
  const w = Math.max(40, ...lines.map((l) => c.measureText(l).width)) + 16;
  return { w, h: lines.length * fontSize * 1.25 + 12 };
}

export default function Board() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inter = useRef<Interaction>({
    mode: "idle", startWX: 0, startWY: 0, origCamX: 0, origCamY: 0,
    lastSX: 0, lastSY: 0,
    handle: null, origEl: null, origBounds: null,
    origPositions: new Map(), moved: false,
  });
  const spaceDown = useRef(false);
  const [draft, setDraft] = useState<DrawElement | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  const elements = useBoard((s) => s.elements);
  const selection = useBoard((s) => s.selection);
  const camera = useBoard((s) => s.camera);
  const tool = useBoard((s) => s.tool);
  const editingId = useBoard((s) => s.editingId);
  const theme = useBoard((s) => s.theme);
  const toolRef = useRef(tool);
  toolRef.current = tool;

  // load persisted
  useEffect(() => {
    useBoard.getState().load();
    useBoard.getState().hydrateTheme();
  }, []);

  // latest render inputs, mirrored for the resize observer callback
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const marqueeRef = useRef(marquee);
  marqueeRef.current = marquee;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  function draw() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const dark = themeRef.current === "dark";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const st = useBoard.getState();
    drawGrid(ctx, st.camera, w, h, dark);
    ctx.save();
    applyCamera(ctx, st.camera);
    // scale line widths by dpr compensation: applyCamera overwrote transform, re-apply dpr
    ctx.setTransform(st.camera.zoom * dpr, 0, 0, st.camera.zoom * dpr, st.camera.x * dpr, st.camera.y * dpr);
    for (const el of st.elements) {
      if (el.id === st.editingId && el.type === "text") continue; // hide while editing
      drawElement(ctx, el, dark);
    }
    const d = draftRef.current;
    if (d) drawElement(ctx, d, dark);
    const sel = st.elements.filter((e) => st.selection.includes(e.id));
    if (sel.length) drawSelection(ctx, sel, st.camera.zoom);
    const m = marqueeRef.current;
    if (m) drawMarquee(ctx, m.x, m.y, m.w, m.h);
    ctx.restore();
  }

  // ---- render loop ----
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    function resize() {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
    }
    function resizeAndDraw() {
      resize();
      draw();
    }
    resizeAndDraw();
    // NB: ResizeObserver fires once on observe(), after the first paint.
    // Setting canvas.width wipes the canvas, so redraw every time.
    const ro = new ResizeObserver(resizeAndDraw);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, selection, camera, draft, marquee, editingId, theme]);

  // ---- keyboard ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const st = useBoard.getState();
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.code === "Space") spaceDown.current = true;
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        st.duplicateSelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        st.selectAll();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        st.deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        st.clearSelection();
        st.setEditing(null);
        setDraft(null);
        setMarquee(null);
        return;
      }
      if (e.key.startsWith("Arrow")) {
        const step = e.shiftKey ? 10 : 2;
        st.commit();
        if (e.key === "ArrowLeft") st.moveSelected(-step, 0);
        if (e.key === "ArrowRight") st.moveSelected(step, 0);
        if (e.key === "ArrowUp") st.moveSelected(0, -step);
        if (e.key === "ArrowDown") st.moveSelected(0, step);
        st.persist();
        e.preventDefault();
        return;
      }
      const t = SHORTCUT[e.key.toLowerCase()];
      if (t && !e.ctrlKey && !e.metaKey) st.setTool(t);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") spaceDown.current = false;
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function canvasPos(e: React.MouseEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function handleAt(wx: number, wy: number): HandleId | null {
    const st = useBoard.getState();
    if (st.selection.length !== 1) return null;
    const el = st.elements.find((e) => e.id === st.selection[0]);
    if (!el) return null;
    if (el.type === "pencil" || el.type === "line" || el.type === "arrow") return null;
    const b = boundsOf(el);
    const tol = 10 / st.camera.zoom;
    const handles = handlePositions(b);
    for (const k of Object.keys(handles) as HandleId[]) {
      const p = handles[k];
      if (Math.abs(p.x - wx) < tol && Math.abs(p.y - wy) < tol) return k;
    }
    return null;
  }

  function onMouseDown(e: React.MouseEvent) {
    const st = useBoard.getState();
    const pos = canvasPos(e);
    const wpt = screenToWorld(pos.x, pos.y, st.camera);
    const it = inter.current;
    it.startWX = wpt.x;
    it.startWY = wpt.y;
    it.origCamX = st.camera.x;
    it.origCamY = st.camera.y;
    it.lastSX = pos.x;
    it.lastSY = pos.y;
    it.moved = false;

    // pan: hand tool, middle button, or space
    if (toolRef.current === "hand" || e.button === 1 || spaceDown.current) {
      it.mode = "panning";
      return;
    }

    if (toolRef.current === "select") {
      const h = handleAt(wpt.x, wpt.y);
      if (h && st.selection.length === 1) {
        const el = st.elements.find((x) => x.id === st.selection[0])!;
        st.commit();
        it.mode = "resizing";
        it.handle = h;
        it.origEl = JSON.parse(JSON.stringify(el));
        it.origBounds = { ...boundsOf(el), ...(() => {
          // use tight box for rect-like (strip pad)
          return { x: el.x, y: el.y, w: Math.max(5, el.w), h: Math.max(5, el.h) };
        })() };
        return;
      }
      // hit test topmost
      const hit = [...st.elements].reverse().find((el) => hitTest(el, wpt.x, wpt.y, st.camera.zoom));
      if (hit) {
        if (!st.selection.includes(hit.id)) st.select([hit.id], e.shiftKey);
        else if (e.shiftKey) st.select(st.selection.filter((id) => id !== hit.id));
        st.commit();
        it.mode = "moving";
        it.origPositions = new Map(
          st.elements.filter((el) => st.selection.includes(el.id)).map((el) => [el.id, { x: el.x, y: el.y }])
        );
        return;
      }
      it.mode = "marquee";
      setMarquee({ x: wpt.x, y: wpt.y, w: 0, h: 0 });
      if (!e.shiftKey) st.clearSelection();
      return;
    }

    if (toolRef.current === "eraser") {
      const hit = [...st.elements].reverse().find((el) => hitTest(el, wpt.x, wpt.y, st.camera.zoom));
      if (hit) st.removeElement(hit.id);
      it.mode = "moving"; // reuse for drag-erase
      return;
    }

    if (toolRef.current === "text") {
      const el: DrawElement = {
        id: uid(), type: "text", x: wpt.x, y: wpt.y, w: 120, h: 32, rotation: 0,
        text: "", fontSize: st.style.fontSize, stroke: st.style.stroke,
        fill: "transparent", strokeWidth: st.style.strokeWidth, opacity: st.style.opacity,
      };
      st.commit();
      useBoard.setState((s) => ({ elements: [...s.elements, el], selection: [el.id] }));
      st.setEditing(el.id);
      setTextValue("");
      st.persist();
      return;
    }

    // shape + pencil creation
    const { style } = st;
    if (toolRef.current === "pencil") {
      it.mode = "pencil";
      setDraft({
        id: "draft", type: "pencil", x: wpt.x, y: wpt.y, w: 0, h: 0, rotation: 0,
        points: [{ x: 0, y: 0 }], stroke: style.stroke, fill: "transparent",
        strokeWidth: style.strokeWidth, opacity: style.opacity,
      });
      return;
    }
    it.mode = "drawing";
    const type = toolRef.current as DrawElement["type"];
    setDraft({
      id: "draft", type, x: wpt.x, y: wpt.y, w: 0, h: 0, rotation: 0,
      points: type === "line" || type === "arrow" ? [{ x: 0, y: 0 }, { x: 0, y: 0 }] : undefined,
      text: "", fontSize: style.fontSize, stroke: style.stroke, fill: style.fill,
      strokeWidth: style.strokeWidth, opacity: style.opacity,
    });
  }

  function onMouseMove(e: React.MouseEvent) {
    const st = useBoard.getState();
    const pos = canvasPos(e);
    const wpt = screenToWorld(pos.x, pos.y, st.camera);
    const it = inter.current;
    const dx = wpt.x - it.startWX;
    const dy = wpt.y - it.startWY;
    if (it.mode === "idle") return;
    if (Math.abs(dx) + Math.abs(dy) > 0.5) it.moved = true;

    if (it.mode === "panning") {
      const cam = st.camera;
      st.setCamera({ x: cam.x + (pos.x - it.lastSX), y: cam.y + (pos.y - it.lastSY) });
      it.lastSX = pos.x;
      it.lastSY = pos.y;
      return;
    }
    if (it.mode === "marquee") {
      setMarquee({ x: it.startWX, y: it.startWY, w: dx, h: dy });
      return;
    }
    if (it.mode === "moving") {
      if (toolRef.current === "eraser") {
        const hit = [...st.elements].reverse().find((el) => hitTest(el, wpt.x, wpt.y, st.camera.zoom));
        if (hit) st.removeElement(hit.id);
        return;
      }
      useBoard.setState((s) => ({
        elements: s.elements.map((el) => {
          const o = it.origPositions.get(el.id);
          return o ? { ...el, x: o.x + dx, y: o.y + dy } : el;
        }),
      }));
      return;
    }
    if (it.mode === "resizing" && it.handle && it.origBounds && it.origEl) {
      const nb = resizeBounds(it.origBounds, it.handle, dx, dy, e.shiftKey);
      const n = normalizeRect(nb.x, nb.y, nb.w, nb.h);
      n.w = Math.max(5, n.w);
      n.h = Math.max(5, n.h);
      st.updateElement(it.origEl.id, { x: n.x, y: n.y, w: n.w, h: n.h });
      return;
    }
    if (it.mode === "pencil" && draft) {
      const lx = wpt.x - draft.x;
      const ly = wpt.y - draft.y;
      setDraft({ ...draft, points: [...(draft.points ?? []), { x: lx, y: ly }] });
      return;
    }
    if (it.mode === "drawing" && draft) {
      if (draft.type === "line" || draft.type === "arrow") {
        setDraft({ ...draft, points: [{ x: 0, y: 0 }, { x: dx, y: dy }] });
      } else {
        const n = normalizeRect(it.startWX, it.startWY, dx, dy);
        setDraft({ ...draft, ...n });
      }
    }
  }

  function onMouseUp(e: React.MouseEvent) {
    const st = useBoard.getState();
    const it = inter.current;
    const pos = canvasPos(e);
    const wpt = screenToWorld(pos.x, pos.y, st.camera);

    if (it.mode === "marquee" && marquee) {
      const n = normalizeRect(marquee.x, marquee.y, marquee.w, marquee.h);
      const ids = st.elements.filter((el) => {
        const b = boundsOf(el);
        // tight check: element center inside marquee OR bounds intersect
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        const inCenter = cx >= n.x && cx <= n.x + n.w && cy >= n.y && cy <= n.y + n.h;
        const overlap = b.x < n.x + n.w && b.x + b.w > n.x && b.y < n.y + n.h && b.y + b.h > n.y;
        return n.w < 4 && n.h < 4 ? false : inCenter || overlap;
      }).map((el) => el.id);
      if (ids.length) st.select(ids, e.shiftKey);
      setMarquee(null);
    }
    if ((it.mode === "moving" || it.mode === "resizing") && it.moved) st.persist();
    if (it.mode === "moving" && !it.moved && toolRef.current === "select") {
      // click without drag on empty handled by marquee path; nothing extra
    }

    if (it.mode === "drawing" && draft) {
      const min = 4 / st.camera.zoom;
      const bigEnough =
        draft.type === "line" || draft.type === "arrow"
          ? Math.hypot(draft.points?.[1]?.x ?? 0, draft.points?.[1]?.y ?? 0) > min
          : draft.w > min || draft.h > min;
      if (bigEnough) {
        const el: DrawElement = { ...draft, id: uid(), w: Math.max(2, draft.w), h: Math.max(2, draft.h) };
        if (el.type === "line" || el.type === "arrow") {
          // normalize so origin stays at start
          el.x = it.startWX;
          el.y = it.startWY;
        }
        st.addElement(el, false);
        if (el.type === "text") st.setEditing(el.id);
      }
      setDraft(null);
    }
    if (it.mode === "pencil" && draft) {
      const pts = simplifyPoints(draft.points ?? [], 2 / st.camera.zoom);
      if (pts.length > 1) {
        st.addElement({ ...draft, id: uid(), points: pts }, false);
      } else if (pts.length === 1) {
        st.addElement({ ...draft, id: uid(), points: pts }, false);
      }
      setDraft(null);
    }
    void wpt;
    it.mode = "idle";
    it.handle = null;
    it.origEl = null;
    it.origBounds = null;
  }

  // Native non-passive wheel listener: plain wheel zooms around the cursor,
  // shift+wheel pans. React's onWheel is passive, so preventDefault is a no-op there.
  useEffect(() => {
    const canvas = canvasRef.current!;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const st = useBoard.getState();
      const r = canvas.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      if (e.shiftKey) {
        st.setCamera({ x: st.camera.x - e.deltaX, y: st.camera.y - e.deltaY });
        return;
      }
      const before = screenToWorld(sx, sy, st.camera);
      const zoom = Math.min(4, Math.max(0.15, st.camera.zoom * Math.exp(-e.deltaY * 0.002)));
      st.setCamera({ zoom, x: sx - before.x * zoom, y: sy - before.y * zoom });
    }
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  function onDoubleClick(e: React.MouseEvent) {
    const st = useBoard.getState();
    const pos = canvasPos(e);
    const wpt = screenToWorld(pos.x, pos.y, st.camera);
    const hit = [...st.elements].reverse().find((el) => hitTest(el, wpt.x, wpt.y, st.camera.zoom));
    if (hit && (hit.type === "text" || hit.text !== undefined || hit.type === "rect" || hit.type === "ellipse" || hit.type === "diamond")) {
      st.select([hit.id]);
      st.setEditing(hit.id);
      setTextValue(hit.text ?? "");
    }
  }

  // text overlay
  const editingEl = elements.find((el) => el.id === editingId) ?? null;
  useEffect(() => {
    if (editingEl) setTextValue(editingEl.text ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  function commitText() {
    const st = useBoard.getState();
    if (!editingEl) return;
    const { w, h } = measureText(textValue || "", editingEl.fontSize ?? 20);
    if (editingEl.type === "text" && !textValue.trim()) {
      st.removeElement(editingEl.id);
    } else {
      st.updateElement(editingEl.id, {
        text: textValue,
        w: editingEl.type === "text" ? w : editingEl.w,
        h: editingEl.type === "text" ? h : editingEl.h,
      });
      st.persist();
    }
    st.setEditing(null);
  }

  const overlayPos = editingEl ? worldToScreen(editingEl.x, editingEl.y, camera) : null;

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDoubleClick}
        style={{ cursor: tool === "hand" ? "grab" : tool === "select" ? "default" : "crosshair" }}
      />
      {editingEl && overlayPos && (
        <textarea
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Escape") useBoard.getState().setEditing(null);
            if (e.key === "Enter" && !e.shiftKey && editingEl.type === "text") {
              // allow shift+enter newline; plain enter commits for standalone text
              if (!e.nativeEvent.isComposing) {
                e.preventDefault();
                commitText();
              }
            }
            e.stopPropagation();
          }}
          className="absolute z-20 rounded-md border border-[#c96442] bg-white/95 p-2 outline-none"
          style={{
            left: overlayPos.x,
            top: overlayPos.y,
            fontSize: (editingEl.fontSize ?? 20) * camera.zoom,
            minWidth: 140,
            minHeight: 40,
          }}
          placeholder="Type…"
        />
      )}
    </div>
  );
}
