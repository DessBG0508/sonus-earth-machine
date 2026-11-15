/**
 * SONUS texture + frame pipeline, ported from the v3 prototype.
 *
 * - NASA Blue Marble / Black Marble JPEGs are bundled with the app
 *   (src/assets/textures) — fully offline, no external URLs.
 * - styleGlobe() ports v3's equirect->sphere projection renderer (the
 *   sonification source: shading, rim glow and procedural art are baked
 *   into these pixels exactly like v3).
 * - buildEquirect() renders the same NASA textures + procedural art in
 *   equirectangular space, used as the texture of the 3D WebGL globe.
 * - makeOverlaysEquirect() ports v3's FIRES/NDVI/CLOUDS detection onto
 *   equirect space so the layers wrap the 3D sphere.
 * - genEarthTex() is v3's procedural fallback if the JPEGs ever fail.
 */

import dayTexImport from "@/assets/textures/blue-marble.jpg";
import nightTexImport from "@/assets/textures/black-marble.jpg";
import {
  DiscKey,
  DiscStyle,
  EQ_H,
  EQ_W,
  FSZ,
  GR,
  clamp,
  mulberry32,
} from "./constants";

type StaticTexture = { src: string };

const dayTex = dayTexImport as unknown as StaticTexture;
const nightTex = nightTexImport as unknown as StaticTexture;

/** Bundled NASA texture URLs (hashed static assets, basePath-safe). */
export const NASA_TEXTURES = {
  day: dayTex.src,
  night: nightTex.src,
};

export function newCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

/* ------------------------------------------------------------------ */
/* v3 procedural fallback earth (verbatim port)                        */
/* ------------------------------------------------------------------ */

export function genEarthTex(night: boolean, seed: number): HTMLCanvasElement {
  const tw = 720;
  const th = 360;
  const c = newCanvas(tw, th);
  const x = c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  const R = mulberry32(seed);
  const GS = 24;
  const grid: number[] = [];
  for (let i = 0; i < GS * GS; i++) grid.push(R());
  const g2 = (xx: number, yy: number) => grid[(((yy % GS) + GS) % GS) * GS + (((xx % GS) + GS) % GS)];
  const nse = (u: number, v: number) => {
    const gx = u * GS;
    const gy = v * GS;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const a = g2(x0, y0) + (g2(x0 + 1, y0) - g2(x0, y0)) * fx;
    const b = g2(x0, y0 + 1) + (g2(x0 + 1, y0 + 1) - g2(x0, y0 + 1)) * fx;
    return a + (b - a) * fy;
  };
  const img = x.createImageData(tw, th);
  for (let py = 0; py < th; py++)
    for (let px = 0; px < tw; px++) {
      const u = px / tw;
      const v = py / th;
      const lat = Math.abs(v - 0.5) * 2;
      const e = nse(u, v) * 0.55 + nse(u * 1.7, v * 1.7) * 0.28 + nse(u * 3.1, v * 3.1) * 0.17;
      const land = e > 0.52 - lat * 0.06;
      const i = (py * tw + px) * 4;
      if (night) {
        if (land && e > 0.58 && Math.random() < 0.06) {
          img.data[i] = 255;
          img.data[i + 1] = 210;
          img.data[i + 2] = 150;
        } else {
          img.data[i] = 2;
          img.data[i + 1] = 4;
          img.data[i + 2] = 9;
        }
      } else {
        if (land) {
          img.data[i] = 58 + e * 95;
          img.data[i + 1] = 92 + e * 72;
          img.data[i + 2] = 48;
        } else {
          img.data[i] = 10;
          img.data[i + 1] = 34 + e * 42;
          img.data[i + 2] = 66 + e * 58;
        }
      }
      img.data[i + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  return c;
}

/* ------------------------------------------------------------------ */
/* v3 sphere projection renderer (verbatim port — sonification source) */
/* ------------------------------------------------------------------ */

type TexSource = HTMLImageElement | HTMLCanvasElement;

function sourcePixels(tex: TexSource): { tw: number; th: number; td: Uint8ClampedArray } {
  if (tex instanceof HTMLCanvasElement) {
    const tw = tex.width;
    const th = tex.height;
    const td = tex.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, tw, th).data;
    return { tw, th, td };
  }
  const tw = tex.width;
  const th = tex.height;
  const tc = newCanvas(tw, th);
  tc.getContext("2d")!.drawImage(tex, 0, 0);
  const td = tc.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, tw, th).data;
  return { tw, th, td };
}

export function styleGlobe(tex: TexSource, style: DiscStyle): HTMLCanvasElement {
  const c = newCanvas(FSZ, FSZ);
  const x = c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  const { tw, th, td } = sourcePixels(tex);

  const out = x.createImageData(FSZ, FSZ);
  const C = FSZ / 2;
  for (let py = 0; py < FSZ; py++) {
    const dy = (py - C + 0.5) / GR;
    for (let px = 0; px < FSZ; px++) {
      const dx = (px - C + 0.5) / GR;
      const d2 = dx * dx + dy * dy;
      const i = (py * FSZ + px) * 4;
      if (d2 >= 1) {
        out.data[i + 3] = 0;
        continue;
      }
      const nz = Math.sqrt(1 - d2);
      const lon = Math.atan2(dx, nz);
      const lat = Math.asin(-dy);
      const u = clamp((lon / Math.PI + 1) / 2, 0, 0.9999);
      const v = clamp(0.5 - lat / Math.PI, 0, 0.9999);
      const ti = (Math.floor(v * th) * tw + Math.floor(u * tw)) * 4;
      let r = td[ti];
      let g = td[ti + 1];
      let b = td[ti + 2];
      const diff = nz * 0.82 + 0.2;
      if (style === "night") {
        const lum = (r + g + b) / 765;
        const m = 0.35 + 0.65 * nz;
        if (lum > 0.16) {
          r = Math.min(255, r * m * 1.9);
          g = Math.min(255, g * m * 1.75);
          b = Math.min(255, b * m * 1.3);
        } else {
          r = r * m * 0.3;
          g = g * m * 0.34;
          b = Math.min(255, b * m * 0.55 + 6);
        }
      } else if (style === "aerosol") {
        r = r * diff * 0.52;
        g = g * diff * 0.55;
        b = Math.min(255, b * diff * 0.72);
      } else {
        r = r * diff;
        g = g * diff;
        b = b * diff;
      }
      const rim = Math.pow(1 - nz, 3);
      r += rim * 14;
      g += rim * 95;
      b += rim * 160;
      out.data[i] = Math.min(255, r);
      out.data[i + 1] = Math.min(255, g);
      out.data[i + 2] = Math.min(255, b);
      out.data[i + 3] = 255;
    }
  }
  x.putImageData(out, 0, 0);

  // procedural per-style art, clipped to the globe disc (v3 seeds: 11/47/83)
  x.save();
  x.beginPath();
  x.arc(C, C, GR - 1, 0, 7);
  x.clip();
  const R = mulberry32(style === "ocean" ? 11 : style === "night" ? 47 : 83);
  if (style === "ocean") {
    x.fillStyle = "rgba(18,60,120,.16)";
    x.fillRect(0, 0, FSZ, FSZ);
    const hues = ["34,211,238", "16,185,129", "45,212,191"];
    for (let b2 = 0; b2 < 8; b2++) {
      const y0 = 30 + R() * (FSZ - 60);
      const hue = hues[Math.floor(R() * hues.length)];
      const ph = R() * 6.28;
      const amp = 12 + R() * 26;
      x.strokeStyle = `rgba(${hue},.20)`;
      x.lineWidth = 2 + R() * 2;
      x.beginPath();
      for (let px2 = 0; px2 <= FSZ; px2 += 4) {
        const py2 = y0 + Math.sin(px2 * 0.02 + ph) * amp + Math.sin(px2 * 0.05 + ph * 2) * 6;
        if (px2 === 0) x.moveTo(px2, py2);
        else x.lineTo(px2, py2);
      }
      x.stroke();
    }
  }
  if (style === "night") {
    for (let d = 0; d < 8; d++) {
      x.fillStyle = "rgba(255,90,60,.5)";
      x.beginPath();
      x.arc(R() * FSZ, R() * FSZ, 1.2, 0, 7);
      x.fill();
    }
  }
  if (style === "aerosol") {
    const pal = [
      [168, 97, 255],
      [255, 140, 60],
      [60, 220, 150],
      [236, 72, 153],
    ];
    for (let b2 = 0; b2 < 9; b2++) {
      const col = pal[Math.floor(R() * pal.length)];
      const cx = C + (R() - 0.5) * FSZ * 0.7;
      const cy = C + (R() - 0.5) * FSZ * 0.7;
      const r2 = 24 + R() * 60;
      const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r2);
      rg.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},.34)`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = rg;
      x.beginPath();
      x.arc(cx, cy, r2, 0, 7);
      x.fill();
    }
  }
  x.restore();
  return c;
}

/* ------------------------------------------------------------------ */
/* equirectangular texture for the 3D WebGL globe                      */
/* ------------------------------------------------------------------ */

function drawCover(ctx: CanvasRenderingContext2D, tex: TexSource, w: number, h: number): void {
  const sw = tex.width;
  const sh = tex.height;
  const s = Math.max(w / sw, h / sh);
  ctx.drawImage(tex, (sw - w / s) / 2, (sh - h / s) / 2, w / s, h / s, 0, 0, w, h);
}

/** Renders the disc style across the full equirect map (used by WebGL globe). */
export function buildEquirect(tex: TexSource, style: DiscStyle): HTMLCanvasElement {
  const c = newCanvas(EQ_W, EQ_H);
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  drawCover(x, tex, EQ_W, EQ_H);
  const R = mulberry32(style === "ocean" ? 11 : style === "night" ? 47 : 83);
  if (style === "ocean") {
    x.fillStyle = "rgba(18,60,120,.16)";
    x.fillRect(0, 0, EQ_W, EQ_H);
    const hues = ["34,211,238", "16,185,129", "45,212,191"];
    for (let b2 = 0; b2 < 8; b2++) {
      const y0 = 30 + R() * (EQ_H - 60);
      const hue = hues[Math.floor(R() * hues.length)];
      const ph = R() * 6.28;
      const amp = 12 + R() * 26;
      x.strokeStyle = `rgba(${hue},.20)`;
      x.lineWidth = 2 + R() * 2;
      x.beginPath();
      for (let px2 = 0; px2 <= EQ_W; px2 += 4) {
        const py2 = y0 + Math.sin(px2 * 0.02 + ph) * amp + Math.sin(px2 * 0.05 + ph * 2) * 6;
        if (px2 === 0) x.moveTo(px2, py2);
        else x.lineTo(px2, py2);
      }
      x.stroke();
    }
  }
  if (style === "night") {
    for (let d = 0; d < 8; d++) {
      x.fillStyle = "rgba(255,90,60,.5)";
      x.beginPath();
      x.arc(R() * EQ_W, R() * EQ_H, 1.2, 0, 7);
      x.fill();
    }
  }
  if (style === "aerosol") {
    x.globalCompositeOperation = "multiply";
    x.fillStyle = "rgb(133,140,184)"; // v3 aerosol channel multipliers .52/.55/.72
    x.fillRect(0, 0, EQ_W, EQ_H);
    x.globalCompositeOperation = "source-over";
    const pal = [
      [168, 97, 255],
      [255, 140, 60],
      [60, 220, 150],
      [236, 72, 153],
    ];
    for (let b2 = 0; b2 < 9; b2++) {
      const col = pal[Math.floor(R() * pal.length)];
      const cx = EQ_W / 2 + (R() - 0.5) * EQ_W * 0.7;
      const cy = EQ_H / 2 + (R() - 0.5) * EQ_H * 0.7;
      const r2 = 24 + R() * 60;
      const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r2);
      rg.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},.34)`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = rg;
      x.beginPath();
      x.arc(cx, cy, r2, 0, 7);
      x.fill();
    }
  }
  return c;
}

/* ------------------------------------------------------------------ */
/* FIRES / NDVI / CLOUDS overlays (v3 thresholds, equirect space)      */
/* ------------------------------------------------------------------ */

export interface OverlaySet {
  fires: HTMLCanvasElement;
  ndvi: HTMLCanvasElement;
  clouds: HTMLCanvasElement;
}

export function makeOverlaysEquirect(src: HTMLCanvasElement): OverlaySet {
  const W = src.width;
  const H = src.height;
  const d = src.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, W, H).data;
  const fires = newCanvas(W, H);
  const fx = fires.getContext("2d")!;
  const ndvi = newCanvas(W, H);
  const nx = ndvi.getContext("2d")!;
  const clouds = newCanvas(W, H);
  const cx = clouds.getContext("2d")!;
  for (let y = 0; y < H; y += 2)
    for (let px = 0; px < W; px += 2) {
      const i = (y * W + px) * 4;
      if (d[i + 3] === 0) continue;
      const Rr = d[i];
      const G = d[i + 1];
      const B = d[i + 2];
      const bright = (0.2126 * Rr + 0.7152 * G + 0.0722 * B) / 255;
      const redness = (Rr - (G + B) / 2) / 255;
      const greenness = (G - Math.max(Rr, B)) / 255;
      const sat = (Math.max(Rr, G, B) - Math.min(Rr, G, B)) / 255;
      if (redness > 0.3 && bright > 0.22) {
        const rg = fx.createRadialGradient(px, y, 0, px, y, 6);
        rg.addColorStop(0, "rgba(255,176,32,.85)");
        rg.addColorStop(1, "rgba(255,176,32,0)");
        fx.fillStyle = rg;
        fx.beginPath();
        fx.arc(px, y, 6, 0, 7);
        fx.fill();
      }
      if (greenness > 0.06) {
        nx.fillStyle = `rgba(34,197,94,${clamp(0.12 + greenness, 0, 0.55)})`;
        nx.fillRect(px, y, 2, 2);
      }
      if (bright > 0.42 && sat < 0.12) {
        cx.fillStyle = "rgba(226,232,240,.5)";
        cx.fillRect(px, y, 2, 2);
      }
    }
  cx.strokeStyle = "rgba(226,232,240,.10)";
  cx.lineWidth = 10;
  for (let w = 0; w < 3; w++) {
    cx.beginPath();
    cx.moveTo(0, H * 0.2 + w * H * 0.25);
    cx.bezierCurveTo(W * 0.4, H * 0.1 + w * H * 0.25, W * 0.7, H * 0.5 + w * H * 0.25, W, H * 0.3 + w * H * 0.25);
    cx.stroke();
  }
  return { fires, ndvi, clouds };
}

/* ------------------------------------------------------------------ */
/* frame store (non-reactive singleton shared by audio + canvases)     */
/* ------------------------------------------------------------------ */

export interface DiscFrame {
  /** v3-style projected sphere canvas — THE sonification source. */
  proj: HTMLCanvasElement;
  projCtx: CanvasRenderingContext2D;
  overlays: OverlaySet;
  /** Equirectangular render used as the 3D sphere texture. */
  equirect: HTMLCanvasElement;
  real: boolean;
}

class FrameStore {
  private frames = new Map<DiscKey, DiscFrame>();
  private listeners = new Set<() => void>();

  get(key: DiscKey): DiscFrame | null {
    return this.frames.get(key) ?? null;
  }

  isReal(key: DiscKey): boolean {
    return this.frames.get(key)?.real ?? false;
  }

  set(key: DiscKey, frame: DiscFrame): void {
    this.frames.set(key, frame);
    for (const cb of [...this.listeners]) cb();
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
}

export const frameStore = new FrameStore();

export function buildDiscFrame(
  tex: TexSource,
  style: DiscStyle,
  real: boolean,
): DiscFrame {
  const proj = styleGlobe(tex, style);
  const equirect = buildEquirect(tex, style);
  return {
    proj,
    projCtx: proj.getContext("2d", { willReadFrequently: true })!,
    overlays: makeOverlaysEquirect(equirect),
    equirect,
    real,
  };
}

/** Rebuilds the three procedural disc frames (keeps user-loaded real frames). */
export function rebuildDefaults(day: HTMLImageElement | null, night: HTMLImageElement | null): void {
  const dayT = day ?? genEarthTex(false, 5);
  const nightT = night ?? genEarthTex(true, 9);
  if (!frameStore.isReal("ocean")) frameStore.set("ocean", buildDiscFrame(dayT, "ocean", false));
  if (!frameStore.isReal("night")) frameStore.set("night", buildDiscFrame(nightT, "night", false));
  if (!frameStore.isReal("aerosol")) frameStore.set("aerosol", buildDiscFrame(dayT, "aerosol", false));
}
