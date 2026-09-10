import type { DrawElement } from "./types";

export function screenToWorld(
  sx: number,
  sy: number,
  cam: { x: number; y: number; zoom: number }
) {
  return { x: (sx - cam.x) / cam.zoom, y: (sy - cam.y) / cam.zoom };
}

export function worldToScreen(
  wx: number,
  wy: number,
  cam: { x: number; y: number; zoom: number }
) {
  return { x: wx * cam.zoom + cam.x, y: wy * cam.zoom + cam.y };
}

export function normalizeRect(x: number, y: number, w: number, h: number) {
  return {
    x: w < 0 ? x + w : x,
    y: h < 0 ? y + h : y,
    w: Math.abs(w),
    h: Math.abs(h),
  };
}

export function boundsOf(el: DrawElement) {
  if ((el.type === "line" || el.type === "arrow" || el.type === "pencil") && el.points?.length) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of el.points) {
      const wx = el.x + p.x;
      const wy = el.y + p.y;
      minX = Math.min(minX, wx);
      minY = Math.min(minY, wy);
      maxX = Math.max(maxX, wx);
      maxY = Math.max(maxY, wy);
    }
    const pad = el.strokeWidth + 6;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }
  const pad = el.strokeWidth + 4;
  return { x: el.x - pad, y: el.y - pad, w: el.w + pad * 2, h: el.h + pad * 2 };
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function hitTest(el: DrawElement, wx: number, wy: number, zoom: number): boolean {
  const tol = 8 / zoom + el.strokeWidth / 2;
  if (el.type === "pencil" || el.type === "line" || el.type === "arrow") {
    if (!el.points || el.points.length === 0) return false;
    if (el.points.length === 1) {
      return Math.hypot(wx - (el.x + el.points[0].x), wy - (el.y + el.points[0].y)) < tol;
    }
    for (let i = 0; i < el.points.length - 1; i++) {
      const a = el.points[i];
      const b = el.points[i + 1];
      if (distToSeg(wx, wy, el.x + a.x, el.y + a.y, el.x + b.x, el.y + b.y) < tol) return true;
    }
    return false;
  }
  if (el.type === "text") {
    return wx >= el.x - tol && wx <= el.x + el.w + tol && wy >= el.y - tol && wy <= el.y + el.h + tol;
  }
  if (el.type === "ellipse") {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const rx = Math.abs(el.w) / 2;
    const ry = Math.abs(el.h) / 2;
    if (rx < 1 || ry < 1) return false;
    if (el.fill !== "transparent") {
      const nx = (wx - cx) / (rx + tol);
      const ny = (wy - cy) / (ry + tol);
      if (nx * nx + ny * ny <= 1) return true;
    }
    const nx = (wx - cx) / rx;
    const ny = (wy - cy) / ry;
    const d = Math.abs(1 - (nx * nx + ny * ny));
    // approximate edge distance
    return d < (tol * 2) / Math.max(rx, ry) + 0.08;
  }
  if (el.type === "diamond") {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const dx = Math.abs(wx - cx) / (Math.abs(el.w) / 2 + tol);
    const dy = Math.abs(wy - cy) / (Math.abs(el.h) / 2 + tol);
    if (el.fill !== "transparent" && dx + dy <= 1) return true;
    // edge proximity: check 4 segments
    const pts = [
      { x: cx, y: el.y },
      { x: el.x + el.w, y: cy },
      { x: cx, y: el.y + el.h },
      { x: el.x, y: cy },
    ];
    for (let i = 0; i < 4; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 4];
      if (distToSeg(wx, wy, a.x, a.y, b.x, b.y) < tol) return true;
    }
    return false;
  }
  // rect
  if (el.fill !== "transparent") {
    if (wx >= el.x - tol && wx <= el.x + el.w + tol && wy >= el.y - tol && wy <= el.y + el.h + tol)
      return true;
  }
  const insideX = wx > el.x && wx < el.x + el.w;
  const insideY = wy > el.y && wy < el.y + el.h;
  if (insideX && insideY) {
    // near edge?
    const edge = Math.min(wx - el.x, el.x + el.w - wx, wy - el.y, el.y + el.h - wy);
    return edge < tol;
  }
  return (
    wx >= el.x - tol && wx <= el.x + el.w + tol && wy >= el.y - tol && wy <= el.y + el.h + tol &&
    !(insideX && insideY)
  );
}

export type HandleId = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

export function handlePositions(b: { x: number; y: number; w: number; h: number }) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return {
    nw: { x: b.x, y: b.y },
    ne: { x: b.x + b.w, y: b.y },
    sw: { x: b.x, y: b.y + b.h },
    se: { x: b.x + b.w, y: b.y + b.h },
    n: { x: cx, y: b.y },
    s: { x: cx, y: b.y + b.h },
    e: { x: b.x + b.w, y: cy },
    w: { x: b.x, y: cy },
  } as Record<HandleId, { x: number; y: number }>;
}

export function resizeBounds(
  orig: { x: number; y: number; w: number; h: number },
  handle: HandleId,
  dx: number,
  dy: number,
  keepAspect: boolean
) {
  let { x, y, w, h } = orig;
  const aspect = orig.w / Math.max(1, orig.h);
  if (handle.includes("e")) w += dx;
  if (handle.includes("s")) h += dy;
  if (handle.includes("w")) {
    x += dx;
    w -= dx;
  }
  if (handle.includes("n")) {
    y += dy;
    h -= dy;
  }
  if (keepAspect) {
    if (handle === "e" || handle === "w") h = w / aspect;
    else if (handle === "n" || handle === "s") w = h * aspect;
    else {
      // corner: fit to dominant delta
      if (Math.abs(dx) > Math.abs(dy)) h = w / aspect;
      else w = h * aspect;
      if (handle.includes("w")) x = orig.x + orig.w - w;
      if (handle.includes("n")) y = orig.y + orig.h - h;
    }
  }
  // flip handling: allow negative then normalize by caller
  return { x, y, w, h };
}

// Ramer-Douglas-Peucker simplification for pencil
export function simplifyPoints(
  pts: { x: number; y: number }[],
  tolerance: number
): { x: number; y: number }[] {
  if (pts.length < 3) return pts;
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  const dist = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    distToSeg(p.x, p.y, a.x, a.y, b.x, b.y);
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = dist(pts[i], pts[s], pts[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tolerance && idx > 0) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
