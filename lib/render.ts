import type { Camera, DrawElement } from "./types";
import { boundsOf, handlePositions, type HandleId } from "./geometry";

export const CLAY = "#c96442";
const PAPER = "#f5f3ec";

export function applyCamera(ctx: CanvasRenderingContext2D, cam: Camera) {
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.x, cam.y);
}

export function drawGrid(ctx: CanvasRenderingContext2D, cam: Camera, w: number, h: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  const gap = 24 * cam.zoom;
  if (gap < 8) return;
  const ox = cam.x % gap;
  const oy = cam.y % gap;
  ctx.fillStyle = "rgba(26,25,23,0.13)";
  for (let x = ox; x < w; x += gap) {
    for (let y = oy; y < h; y += gap) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function fillAndStroke(ctx: CanvasRenderingContext2D, el: DrawElement, path: () => void) {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.lineWidth = el.strokeWidth;
  ctx.strokeStyle = el.stroke;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  path();
  if (el.fill === "solid") {
    ctx.fillStyle = el.stroke + "22";
    ctx.fill();
  } else if (el.fill === "hatch") {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = el.stroke + "55";
    ctx.lineWidth = 1;
    const b = boundsOf(el);
    ctx.beginPath();
    for (let i = -b.h; i < b.w + b.h; i += 8) {
      ctx.moveTo(b.x + i, b.y);
      ctx.lineTo(b.x + i + b.h, b.y + b.h);
    }
    ctx.stroke();
    ctx.restore();
  }
  path();
  ctx.stroke();
  ctx.restore();
}

export function drawElement(ctx: CanvasRenderingContext2D, el: DrawElement) {
  if (el.type === "rect") {
    fillAndStroke(ctx, el, () => {
      ctx.beginPath();
      ctx.rect(el.x, el.y, Math.max(1, el.w), Math.max(1, el.h));
    });
    if (el.text) drawLabel(ctx, el);
  } else if (el.type === "ellipse") {
    fillAndStroke(ctx, el, () => {
      ctx.beginPath();
      ctx.ellipse(
        el.x + el.w / 2,
        el.y + el.h / 2,
        Math.abs(el.w) / 2,
        Math.abs(el.h) / 2,
        0,
        0,
        Math.PI * 2
      );
    });
    if (el.text) drawLabel(ctx, el);
  } else if (el.type === "diamond") {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    fillAndStroke(ctx, el, () => {
      ctx.beginPath();
      ctx.moveTo(cx, el.y);
      ctx.lineTo(el.x + el.w, cy);
      ctx.lineTo(cx, el.y + el.h);
      ctx.lineTo(el.x, cy);
      ctx.closePath();
    });
    if (el.text) drawLabel(ctx, el);
  } else if (el.type === "line" || el.type === "arrow") {
    const pts = (el.points ?? []).map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
    if (pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = el.opacity;
    ctx.lineWidth = el.strokeWidth;
    ctx.strokeStyle = el.stroke;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    if (el.type === "arrow" && pts.length >= 2) {
      const a = pts[pts.length - 2];
      const b = pts[pts.length - 1];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const len = 12 + el.strokeWidth * 2;
      ctx.fillStyle = el.stroke;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - len * Math.cos(ang - 0.42), b.y - len * Math.sin(ang - 0.42));
      ctx.lineTo(b.x - len * Math.cos(ang + 0.42), b.y - len * Math.sin(ang + 0.42));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if (el.type === "pencil") {
    const pts = (el.points ?? []).map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
    if (pts.length === 0) return;
    ctx.save();
    ctx.globalAlpha = el.opacity;
    ctx.lineWidth = el.strokeWidth;
    ctx.strokeStyle = el.stroke;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    if (pts.length === 1) {
      ctx.arc(pts[0].x, pts[0].y, el.strokeWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = el.stroke;
      ctx.fill();
    } else {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const mid = { x: (pts[i - 1].x + pts[i].x) / 2, y: (pts[i - 1].y + pts[i].y) / 2 };
        ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mid.x, mid.y);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
    ctx.restore();
  } else if (el.type === "text") {
    ctx.save();
    ctx.globalAlpha = el.opacity;
    ctx.fillStyle = el.stroke;
    ctx.font = `${el.fontSize ?? 20}px Inter, sans-serif`;
    ctx.textBaseline = "top";
    const lines = (el.text ?? "").split("\n");
    lines.forEach((line, i) => ctx.fillText(line, el.x, el.y + i * ((el.fontSize ?? 20) * 1.25)));
    ctx.restore();
  }
}

function drawLabel(ctx: CanvasRenderingContext2D, el: DrawElement) {
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.fillStyle = el.stroke;
  ctx.font = `${el.fontSize ?? 20}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(el.text ?? "", el.x + el.w / 2, el.y + el.h / 2);
  ctx.restore();
}

export function drawSelection(
  ctx: CanvasRenderingContext2D,
  els: DrawElement[],
  zoom: number
) {
  for (const el of els) {
    const b = boundsOf(el);
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4 / zoom;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = CLAY;
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([]);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.restore();
  }
  if (els.length === 1) {
    const b = boundsOf(els[0]);
    const handles = handlePositions(b);
    ctx.save();
    for (const k of Object.keys(handles) as HandleId[]) {
      const p = handles[k];
      const s = 9 / zoom;
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = CLAY;
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      ctx.roundRect(p.x - s / 2, p.y - s / 2, s, s, 2 / zoom);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawMarquee(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.strokeStyle = CLAY;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.fillStyle = "rgba(201,100,66,0.08)";
  const nx = w < 0 ? x + w : x;
  const ny = h < 0 ? y + h : y;
  ctx.fillRect(nx, ny, Math.abs(w), Math.abs(h));
  ctx.strokeRect(nx, ny, Math.abs(w), Math.abs(h));
  ctx.restore();
}
