import type { DrawElement } from "./types";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function sceneToSVG(els: DrawElement[], padding = 40): string {
  if (els.length === 0)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#f5f3ec"/></svg>`;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const el of els) {
    const pts =
      el.points?.map((p) => ({ x: el.x + p.x, y: el.y + p.y })) ??
      [
        { x: el.x, y: el.y },
        { x: el.x + el.w, y: el.y + el.h },
      ];
    if (el.type === "text") pts.push({ x: el.x + el.w, y: el.y + el.h });
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  const w = maxX - minX + padding * 2;
  const h = maxY - minY + padding * 2;
  const ox = -minX + padding;
  const oy = -minY + padding;
  const parts: string[] = [];
  for (const el of els) {
    const common = `stroke="${el.stroke}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}"`;
    if (el.type === "rect")
      parts.push(
        `<rect x="${el.x + ox}" y="${el.y + oy}" width="${el.w}" height="${el.h}" fill="none" ${common}/>`
      );
    else if (el.type === "ellipse")
      parts.push(
        `<ellipse cx="${el.x + el.w / 2 + ox}" cy="${el.y + el.h / 2 + oy}" rx="${Math.abs(el.w) / 2}" ry="${Math.abs(el.h) / 2}" fill="none" ${common}/>`
      );
    else if (el.type === "diamond") {
      const cx = el.x + el.w / 2 + ox;
      const cy = el.y + el.h / 2 + oy;
      parts.push(
        `<polygon points="${cx},${el.y + oy} ${el.x + el.w + ox},${cy} ${cx},${el.y + el.h + oy} ${el.x + ox},${cy}" fill="none" ${common}/>`
      );
    } else if (el.type === "line" || el.type === "arrow" || el.type === "pencil") {
      const d = (el.points ?? [])
        .map((p, i) => `${i === 0 ? "M" : "L"}${el.x + p.x + ox} ${el.y + p.y + oy}`)
        .join(" ");
      const marker = el.type === "arrow" ? ` marker-end="url(#ah)"` : "";
      parts.push(`<path d="${d}" fill="none" ${common}${marker}/>`);
    } else if (el.type === "text")
      parts.push(
        `<text x="${el.x + ox}" y="${el.y + oy + (el.fontSize ?? 20)}" font-size="${el.fontSize ?? 20}" fill="${el.stroke}" font-family="Inter,sans-serif">${esc(el.text ?? "")}</text>`
      );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><marker id="ah" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#1a1917"/></marker></defs><rect width="${w}" height="${h}" fill="#f5f3ec"/>${parts.join("")}</svg>`;
}

export function sceneToJSON(els: DrawElement[], name: string): string {
  return JSON.stringify({ app: "dradraft", version: 1, name, elements: els }, null, 2);
}

export function sceneFromJSON(raw: string): { elements: DrawElement[]; name: string } {
  const data = JSON.parse(raw);
  const elements = Array.isArray(data) ? data : (data.elements as DrawElement[]);
  if (!Array.isArray(elements)) throw new Error("Invalid scene file");
  return { elements, name: data.name ?? "Imported draft" };
}
