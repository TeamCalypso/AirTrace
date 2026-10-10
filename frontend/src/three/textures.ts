import * as THREE from "three";
import landJson from "@/data/land.json";
import regionJson from "@/data/region.json";
import { WORLD_LIGHTS } from "@/lib/scene-data";
import { hashSeed, latLngToVec3, rng } from "@/lib/geo";

const LAND = (landJson as { rings: number[][] }).rings;
const REGION = (regionJson as { rings: number[][] }).rings;

export const TEXTURE_W = 3072;
export const TEXTURE_H = 1536;

const lngToX = (lng: number) => ((lng + 180) / 360) * TEXTURE_W;
const latToY = (lat: number) => ((90 - lat) / 180) * TEXTURE_H;

function traceRings(ctx: CanvasRenderingContext2D, rings: number[][]) {
  ctx.beginPath();
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 2) {
      const x = lngToX(ring[i]);
      const y = latToY(ring[i + 1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { canvas, ctx };
}

/** Continents rasterised from Natural Earth 50m land. */
export function buildLandMask() {
  const { canvas, ctx } = makeCanvas(TEXTURE_W, TEXTURE_H);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
  ctx.fillStyle = "#ffffff";
  traceRings(ctx, LAND);
  ctx.fill("evenodd");
  // soften the coast just enough to avoid hard 1px aliasing
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Regional state borders as flat [x,y,z] pairs — rendered as crisp 3D lines. */
export function buildRegionLinePositions(): number[] {
  const out: number[] = [];
  for (const ring of REGION) {
    for (let i = 0; i + 3 < ring.length; i += 2) {
      const a = latLngToVec3(ring[i + 1], ring[i], 1.0018);
      const b = latLngToVec3(ring[i + 3], ring[i + 2], 1.0018);
      out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  }
  return out;
}

/** City lights: amber speckles from a hand-curated city list, clipped to land. */
export function buildNightLights() {
  const { canvas, ctx } = makeCanvas(TEXTURE_W, TEXTURE_H);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
  const next = rng(hashSeed("night-lights-v3"));

  const glow = (x: number, y: number, r: number, alpha: number, hue: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.35, `rgba(255,214,150,${alpha * 0.55})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hue;
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // dense speckle clusters around each major city
  for (const [lat, lng, intensity] of WORLD_LIGHTS) {
    const x = lngToX(lng);
    const y = latToY(lat);
    const spread = 26 + intensity * 46;
    const speckles = Math.round(120 * intensity);
    for (let i = 0; i < speckles; i++) {
      const a = next() * Math.PI * 2;
      const r = Math.pow(next(), 0.55) * spread;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r * 0.75;
      glow(px, py, 1.4 + next() * 3.4, 0.24 + 0.4 * (1 - r / spread), "#ffd9a0");
    }
    glow(x, y, spread * 0.85, 0.16 * intensity, "#ffe9c4");
  }

  // faint village glow across populated latitudes
  for (let i = 0; i < 26000; i++) {
    const lat = Math.asin(next() * 2 - 1) / (Math.PI / 180);
    const lng = next() * 360 - 180;
    // weight towards the 20-45N band (South + East Asia, MENA, Europe shoulders)
    const weight = Math.exp(-(((lat - 28) / 22) ** 2)) * 0.85 + 0.15;
    if (next() > weight) continue;
    const x = lngToX(lng);
    const y = latToY(lat);
    glow(x, y, 1 + next() * 1.8, 0.06 + next() * 0.1, "#ffcf94");
  }

  // clip to land
  const land = makeCanvas(TEXTURE_W, TEXTURE_H);
  land.ctx.fillStyle = "#000";
  land.ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
  land.ctx.fillStyle = "#fff";
  traceRings(land.ctx, LAND);
  land.ctx.fill("evenodd");
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(land.canvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Soft radial sprite used for fires, smoke puffs and the pin. */
export function buildGlowSprite(power = 2.4) {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - half, y - half) / half;
      const a = Math.pow(Math.max(0, 1 - d), power);
      const i = (y * size + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Thin vertical streak for the falling smoke column / rain-out look. */
export function buildStreakSprite() {
  const w = 32;
  const h = 128;
  const { canvas, ctx } = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x - w / 2) / (w / 2);
      const dy = Math.abs(y - h / 2) / (h / 2);
      const a = Math.max(0, 1 - dx ** 2) * Math.max(0, 1 - dy ** 3);
      const i = (y * w + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 220);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
