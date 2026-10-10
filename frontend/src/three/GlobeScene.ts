import * as THREE from "three";
import landJson from "@/data/land.json";
import { WORLD_LIGHTS, DISTRICTS, CORRIDORS } from "@/lib/scene-data";

/**
 * Airtrace — cinematic globe scene.
 *
 * One continuous Three.js scene; a scroll progress value (0..1) drives the
 * camera along a Catmull-Rom path while layered elements (satellite swath,
 * fire detections, wind transport, inversion lid, neighborhood marker)
 * fade in and out of a shared timeline. Everything is disposed cleanly.
 */

const D2R = Math.PI / 180;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Calibration offset (degrees) between the painted texture and true lat/lng. */
const LNG_CALIB = 0;

const DELHI = { lat: 28.6448, lng: 77.2167 };

const FIRE_CLUSTERS = [
  { lat: 29.62, lng: 75.84 }, // Bathinda, Punjab
  { lat: 29.25, lng: 76.48 }, // Muktsar, Punjab
  { lat: 28.9, lng: 76.9 }, // Bhiwani, Haryana
  { lat: 28.42, lng: 76.82 }, // Hisar, Haryana
  { lat: 29.92, lng: 76.9 }, // Ludhiana, Punjab
  { lat: 28.18, lng: 76.4 }, // Charkhi Dadri, Haryana
  { lat: 30.05, lng: 75.25 }, // Firozpur, Punjab
];

export interface CameraInfo {
  progress: number;
  lat: number;
  lng: number;
  dist: number;
  chapter: number;
}

export interface GlobeOptions {
  quality: "low" | "high";
  reducedMotion: boolean;
  onInfo?: (info: CameraInfo) => void;
  onContextLost?: () => void;
}

export interface GlobeHandles {
  setProgress(p: number): void;
  setStaticFrame(p: number): void;
  dispose(): void;
}

export function chapterFor(p: number): number {
  if (p < 0.2) return 1;
  if (p < 0.4) return 2;
  if (p < 0.58) return 3;
  if (p < 0.78) return 4;
  return 5;
}

const CHAPTER_NAMES = ["ORBIT", "FIRE", "WIND", "INVERSION", "NEIGHBORHOOD"];

function smooth(p: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function latLngToVec3(lat: number, lng: number, r = 1): THREE.Vector3 {
  const p = lat * D2R;
  const l = (lng + LNG_CALIB) * D2R;
  return new THREE.Vector3(
    r * Math.cos(p) * Math.cos(l),
    r * Math.sin(p),
    -r * Math.cos(p) * Math.sin(l),
  );
}

function vecToLatLng(v: THREE.Vector3): { lat: number; lng: number } {
  const r = v.length();
  const lat = Math.asin(THREE.MathUtils.clamp(v.y / r, -1, 1)) / D2R;
  let lng = Math.atan2(-v.z, v.x) / D2R - LNG_CALIB;
  if (lng < -180) lng += 360;
  return { lat, lng };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* textures                                                            */
/* ------------------------------------------------------------------ */

async function buildRadiantEarthTexture(quality: "low" | "high"): Promise<THREE.Texture> {
  const isHigh = quality === "high";
  const W = isHigh ? 3072 : 2048;
  const H = isHigh ? 1536 : 1024;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false })!;

  const lngToX = (lng: number) => ((lng + 180) / 360) * W;
  const latToY = (lat: number) => ((90 - lat) / 180) * H;

  // 1. Ocean base: deep, rich abyssal midnight-teal
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, H);
  oceanGrad.addColorStop(0, "#06130f");
  oceanGrad.addColorStop(0.25, "#081914");
  oceanGrad.addColorStop(0.5, "#0b251d");
  oceanGrad.addColorStop(0.75, "#081914");
  oceanGrad.addColorStop(1, "#06130f");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Continents rasterised from Natural Earth 50m (land.json)
  const LAND = (landJson as { rings: number[][] }).rings;

  // Pre-render land mask on separate canvas for exact clipping
  const landCanvas = document.createElement("canvas");
  landCanvas.width = W;
  landCanvas.height = H;
  const lctx = landCanvas.getContext("2d")!;
  lctx.fillStyle = "#000000";
  lctx.fillRect(0, 0, W, H);
  lctx.fillStyle = "#ffffff";
  lctx.beginPath();
  for (const ring of LAND) {
    for (let i = 0; i < ring.length; i += 2) {
      const x = lngToX(ring[i]);
      const y = latToY(ring[i + 1]);
      if (i === 0) lctx.moveTo(x, y);
      else lctx.lineTo(x, y);
    }
  }
  lctx.fill("evenodd");

  // Coastal shelf outer halo (shallow continental waters)
  ctx.save();
  ctx.strokeStyle = "rgba(25, 78, 60, 0.55)";
  ctx.lineWidth = isHigh ? 7 : 4;
  ctx.beginPath();
  for (const ring of LAND) {
    for (let i = 0; i < ring.length; i += 2) {
      const x = lngToX(ring[i]);
      const y = latToY(ring[i + 1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Continent fill: visible, distinct forest/slate-teal
  ctx.fillStyle = "#163a2f";
  ctx.fill("evenodd");

  // Crisp coastline stroke
  ctx.strokeStyle = "#225848";
  ctx.lineWidth = isHigh ? 2.0 : 1.4;
  ctx.stroke();
  ctx.restore();

  // 3. Load NASA night lights (earth-night.jpg) and screen-blend
  try {
    const res = await fetch("/images/earth-night.jpg");
    if (res.ok) {
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      const nasaCanvas = document.createElement("canvas");
      nasaCanvas.width = W;
      nasaCanvas.height = H;
      const nctx = nasaCanvas.getContext("2d")!;
      nctx.drawImage(bmp, 0, 0, W, H);

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.45;
      ctx.drawImage(nasaCanvas, 0, 0);
      ctx.restore();
    }
  } catch {
    // proceed without NASA texture if unavailable
  }

  // 4. Subtle, minimal procedural pinpoint city lights
  const lightsCanvas = document.createElement("canvas");
  lightsCanvas.width = W;
  lightsCanvas.height = H;
  const lightsCtx = lightsCanvas.getContext("2d")!;
  lightsCtx.fillStyle = "#000000";
  lightsCtx.fillRect(0, 0, W, H);

  const rng = mulberry32(42);

  const drawGlow = (
    x: number,
    y: number,
    r: number,
    intensity: number,
  ) => {
    // Bare-minimum tiny pinpoint dot with soft edge
    const g = lightsCtx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
    g.addColorStop(0, `rgba(255, 240, 205, ${0.45 * intensity})`);
    g.addColorStop(0.4, `rgba(255, 190, 75, ${0.25 * intensity})`);
    g.addColorStop(1, "rgba(255, 140, 30, 0)");
    lightsCtx.fillStyle = g;
    lightsCtx.beginPath();
    lightsCtx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
    lightsCtx.fill();
  };

  // Only key primary metropolitan centers — bare minimum radius (1.8px - 3.2px)
  for (const [lat, lng, intensity] of WORLD_LIGHTS) {
    if (intensity < 0.7) continue; // Keep only principal global hubs, greatly decreasing spot count
    const x = lngToX(lng);
    const y = latToY(lat);
    const r = (isHigh ? 2.2 : 1.5) + intensity * (isHigh ? 1.2 : 0.8);
    drawGlow(x, y, r, intensity * 0.55);

    // Only 6-10 tiny pinpoint speckles around major hubs
    const speckles = Math.round(10 * intensity);
    for (let i = 0; i < speckles; i++) {
      const a = rng() * Math.PI * 2;
      const dist = Math.pow(rng(), 0.7) * (r * 3.2);
      const px = x + Math.cos(a) * dist;
      const py = y + Math.sin(a) * dist * 0.75;
      drawGlow(px, py, 0.85, 0.22 * (1 - dist / (r * 3.2)));
    }
  }

  // Faint, sparse village pinpricks across populated latitudes (bare minimum)
  const villageCount = isHigh ? 2200 : 1100;
  for (let i = 0; i < villageCount; i++) {
    const lat = Math.asin(rng() * 2 - 1) / D2R;
    const lng = rng() * 360 - 180;
    const weight = Math.exp(-Math.pow((lat - 27) / 22, 2)) * 0.85 + 0.15;
    if (rng() > weight) continue;
    const x = lngToX(lng);
    const y = latToY(lat);
    drawGlow(x, y, 0.8, 0.15);
  }

  // Clip lights strictly to land so oceans remain clear
  lightsCtx.globalCompositeOperation = "destination-in";
  lightsCtx.drawImage(landCanvas, 0, 0);
  lightsCtx.globalCompositeOperation = "source-over";

  // Gentle single screen composite onto main Earth canvas at bare-minimum alpha
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.4;
  ctx.drawImage(lightsCanvas, 0, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function makeRadialTexture(inner: string, mid: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function makeLabelSprite(
  text: string,
  color: string,
  scale: [number, number],
): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.font = '500 54px "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.fillText(text, 512, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale[0], scale[1], 1);
  return sprite;
}

/* ------------------------------------------------------------------ */
/* main factory                                                        */
/* ------------------------------------------------------------------ */

export async function createGlobeScene(
  canvas: HTMLCanvasElement,
  opts: GlobeOptions,
): Promise<GlobeHandles> {
  const high = opts.quality === "high";

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, high ? 1.6 : 1.25),
  );
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    120,
  );

  const earthGroup = new THREE.Group();
  scene.add(earthGroup);

  /* --- earth ------------------------------------------------------- */
  const tex = await buildRadiantEarthTexture(opts.quality);
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, high ? 96 : 64, high ? 64 : 48),
    new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff }),
  );
  earthGroup.add(earth);

  /* --- inner atmospheric limb haze --------------------------------- */
  const limbMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x286352) } },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.2);
        gl_FragColor = vec4(uColor * f * 1.35, f * 0.7);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const limb = new THREE.Mesh(new THREE.SphereGeometry(1.004, 64, 48), limbMat);
  earthGroup.add(limb);

  /* --- graticule --------------------------------------------------- */
  {
    const pts: number[] = [];
    const R = 1.002;
    for (let lat = -75; lat <= 75; lat += 15) {
      for (let lng = 0; lng < 360; lng += 4) {
        const a = latLngToVec3(lat, lng, R);
        const b = latLngToVec3(lat, lng + 4, R);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (let lng = -180; lng < 180; lng += 15) {
      for (let lat = -80; lat < 80; lat += 4) {
        const a = latLngToVec3(lat, lng, R);
        const b = latLngToVec3(lat + 4, lng, R);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const graticule = new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({
        color: 0x7ebaa7,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    earthGroup.add(graticule);
  }

  /* --- atmosphere rim ---------------------------------------------- */
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.85 } },
    vertexShader: `
      varying vec3 vN;
      void main() {
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vN;
      void main() {
        float i = pow(clamp(dot(vN, vec3(0.0, 0.0, 1.0)) + 1.02, 0.0, 1.0), 6.0);
        vec3 col = mix(vec3(0.07, 0.34, 0.28), vec3(0.82, 0.93, 0.57), i);
        gl_FragColor = vec4(col * i, i * uOpacity);
      }`,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.065, 64, 48), atmoMat);
  scene.add(atmo);

  /* --- stars -------------------------------------------------------- */
  {
    const n = high ? 750 : 400;
    const pos = new Float32Array(n * 3);
    const rng = mulberry32(99);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1)
        .normalize()
        .multiplyScalar(26 + rng() * 22);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: 0x9fb8ae,
        size: 1.6,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    scene.add(stars);
  }

  /* --- TROPOMI swath ------------------------------------------------ */
  const swathMat = new THREE.MeshBasicMaterial({
    color: 0xd0ee91,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const swath = new THREE.Mesh(
    new THREE.SphereGeometry(1.006, 128, 1, 0, Math.PI * 2, 55 * D2R, 20 * D2R),
    swathMat,
  );
  earthGroup.add(swath);

  const latRing = (lat: number, color: number, opacity: number) => {
    const g = new THREE.RingGeometry(0.9995, 1.0, 160);
    const ring = new THREE.Mesh(
      g,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const cl = Math.cos(lat * D2R);
    ring.scale.set(cl, 1, cl);
    ring.position.y = Math.sin(lat * D2R);
    return ring;
  };
  const swathTop = latRing(35, 0xd0ee91, 0.4);
  const swathBottom = latRing(15, 0xd0ee91, 0.4);
  const scanRingMat = new THREE.MeshBasicMaterial({
    color: 0xd0ee91,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const scanRing = new THREE.Mesh(new THREE.RingGeometry(0.999, 1.0, 160), scanRingMat);
  earthGroup.add(swathTop, swathBottom, scanRing);

  /* --- satellite ---------------------------------------------------- */
  const satGroup = new THREE.Group();
  {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.014, 0.032),
      new THREE.MeshBasicMaterial({ color: 0xcfd8ce }),
    );
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x3d5a7a });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.002, 0.018), panelMat);
    p1.position.x = 0.045;
    const p2 = p1.clone();
    p2.position.x = -0.045;
    satGroup.add(body, p1, p2);
  }
  const satOrbit = new THREE.Group();
  satOrbit.quaternion.setFromEuler(new THREE.Euler(0.45, 0, 0.25));
  satOrbit.add(satGroup);
  scene.add(satOrbit);

  const beamGeom = new THREE.BufferGeometry();
  beamGeom.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const beamMat = new THREE.LineBasicMaterial({
    color: 0xd0ee91,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const beam = new THREE.Line(beamGeom, beamMat);
  scene.add(beam);

  /* --- fire detections ---------------------------------------------- */
  const fireVertex = `
    uniform float uTime;
    uniform float uPx;
    attribute float aSeed;
    varying float vP;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      float pulse = 0.6 + 0.4 * sin(uTime * 2.1 + aSeed * 6.28318);
      vP = pulse;
      gl_PointSize = uPx * (0.75 + 0.45 * pulse) * (1.4 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`;
  const fireFragment = `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying float vP;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = pow(smoothstep(0.5, 0.0, d), 1.9);
      float core = smoothstep(0.16, 0.0, d);
      vec3 col = mix(uColor, vec3(1.0, 0.94, 0.84), core * 0.85);
      gl_FragColor = vec4(col, a * uOpacity * (0.5 + 0.5 * vP));
    }`;

  const makeFire = (positions: Float32Array, px: number, color: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const n = positions.length / 3;
    const seeds = new Float32Array(n);
    const rng = mulberry32(positions.length * 7 + 3);
    for (let i = 0; i < n; i++) seeds[i] = rng();
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: fireVertex,
      fragmentShader: fireFragment,
      uniforms: {
        uTime: { value: 0 },
        uPx: { value: px },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
    });
    const pts = new THREE.Points(g, m);
    earthGroup.add(pts);
    return m;
  };

  let fireClustersMat: THREE.ShaderMaterial;
  let fireDetectionsMat: THREE.ShaderMaterial;
  {
    const rng = mulberry32(20241002);
    const clusterPos: number[] = [];
    for (const c of FIRE_CLUSTERS) {
      const v = latLngToVec3(c.lat, c.lng, 1.008);
      clusterPos.push(v.x, v.y, v.z);
    }
    const detPos: number[] = [];
    for (let i = 0; i < 56; i++) {
      let lat: number, lng: number;
      if (i % 10 !== 9) {
        const c = FIRE_CLUSTERS[Math.floor(rng() * FIRE_CLUSTERS.length)];
        lat = c.lat + (rng() - 0.5) * 1.0;
        lng = c.lng + (rng() - 0.5) * 1.1;
      } else {
        lat = 27.9 + rng() * 2.5;
        lng = 74.4 + rng() * 3.5;
      }
      const v = latLngToVec3(lat, lng, 1.007);
      detPos.push(v.x, v.y, v.z);
    }
    fireClustersMat = makeFire(
      new Float32Array(clusterPos),
      high ? 34 : 24,
      0xf49a6b,
    );
    fireDetectionsMat = makeFire(new Float32Array(detPos), 15, 0xf4b06b);
  }

  /* --- Delhi marker -------------------------------------------------- */
  const delhiN = latLngToVec3(DELHI.lat, DELHI.lng, 1);
  const markerGroup = new THREE.Group();
  {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf49a6b,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.014, 0.017, 48), ringMat);
    ring.position.copy(delhiN.clone().multiplyScalar(1.004));
    ring.lookAt(delhiN.clone().multiplyScalar(3));
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xf0f0e4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.004, 24), dotMat);
    dot.position.copy(delhiN.clone().multiplyScalar(1.005));
    dot.lookAt(delhiN.clone().multiplyScalar(3));
    const label = makeLabelSprite(
      "DELHI NCR · 28.64°N 77.22°E",
      "rgba(240,240,228,0.95)",
      [0.34, 0.043],
    );
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, delhiN).normalize();
    label.position.copy(
      delhiN.clone().multiplyScalar(1.01).addScaledVector(right, 0.2),
    );
    markerGroup.add(ring, dot, label);
    markerGroup.userData = { ringMat, dotMat, labelMat: label.material };
  }
  earthGroup.add(markerGroup);

  /* --- wind transport ------------------------------------------------ */
  const windN = high ? 820 : 320;
  const windPos = new Float32Array(windN * 3);
  const windT = new Float32Array(windN);
  const windSeed = new Float32Array(windN);
  const windMeta: Array<{ src: THREE.Vector3; t0: number; spd: number; wob: number }> =
    [];
  {
    const rng = mulberry32(555);
    const targets = FIRE_CLUSTERS.map((c) => latLngToVec3(c.lat, c.lng, 1));
    for (let i = 0; i < windN; i++) {
      const c = targets[Math.floor(rng() * targets.length)];
      const j = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5)
        .multiplyScalar(0.03);
      windMeta.push({
        src: c.clone().add(j).normalize(),
        t0: rng(),
        spd: 0.05 + rng() * 0.075,
        wob: rng() * Math.PI * 2,
      });
    }
  }
  const windGeom = new THREE.BufferGeometry();
  windGeom.setAttribute("position", new THREE.BufferAttribute(windPos, 3));
  windGeom.setAttribute("aT", new THREE.BufferAttribute(windT, 1));
  const windMat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aT;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = smoothstep(0.0, 0.12, aT) * (1.0 - smoothstep(0.85, 1.0, aT));
        gl_PointSize = (14.0 / -mv.z) * (0.55 + 0.45 * aT);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.08, d);
        gl_FragColor = vec4(vec3(0.75, 0.88, 0.55), a * vA * uOpacity * 0.8);
      }`,
    uniforms: { uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const windPoints = new THREE.Points(windGeom, windMat);
  earthGroup.add(windPoints);

  /* --- comet vector fan --------------------------------------------- */
  const cometLines = high ? 11 : 6;
  const cometData: Array<[THREE.Vector3, THREE.Vector3]> = [];
  {
    const rng = mulberry32(777);
    for (let k = 0; k < cometLines; k++) {
      const src = latLngToVec3(28.9 + rng() * 1.3, 74.7 + rng() * 1.9, 1.012);
      const end = latLngToVec3(28.55 + rng() * 0.25, 76.95 + rng() * 0.35, 1.014);
      cometData.push([src, end]);
    }
  }
  const cometPos = new Float32Array(cometLines * 6);
  const cometT = new Float32Array(cometLines * 2);
  const cometSeed = new Float32Array(cometLines * 2);
  cometData.forEach(([a, b], k) => {
    cometPos.set([a.x, a.y, a.z, b.x, b.y, b.z], k * 6);
    cometT.set([0, 1], k * 2);
    cometSeed.set([k / cometLines, k / cometLines], k * 2);
  });
  const cometGeom = new THREE.BufferGeometry();
  cometGeom.setAttribute("position", new THREE.BufferAttribute(cometPos, 3));
  cometGeom.setAttribute("aT", new THREE.BufferAttribute(cometT, 1));
  cometGeom.setAttribute(
    "aSeed",
    new THREE.BufferAttribute(cometSeed, 1),
  );
  const cometMat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aT;
      attribute float aSeed;
      varying float vT;
      varying float vSeed;
      void main() {
        vT = aT;
        vSeed = aSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      varying float vT;
      varying float vSeed;
      void main() {
        float head = fract(uTime * 0.33 + vSeed);
        float dd = mod(head - vT + 1.0, 1.0);
        float alpha = 0.1 + 0.85 * exp(-dd * 5.5);
        gl_FragColor = vec4(vec3(0.78, 0.9, 0.6), alpha * uOpacity);
      }`,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const comets = new THREE.LineSegments(cometGeom, cometMat);
  earthGroup.add(comets);

  /* --- probabilistic corridor (widening ribbon) ---------------------- */
  {
    const src = latLngToVec3(29.3, 76.1, 1);
    const dst = latLngToVec3(DELHI.lat, DELHI.lng, 1);
    const steps = 26;
    const left: THREE.Vector3[] = [];
    const right: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mid = src
        .clone()
        .lerp(dst, t)
        .normalize()
        .multiplyScalar(1.006 + 0.03 * Math.sin(Math.PI * t));
      const dir = dst
        .clone()
        .lerp(src, t)
        .sub(src.clone().lerp(dst, t).normalize())
        .normalize();
      const side = new THREE.Vector3().crossVectors(mid, dir).normalize();
      const w = 0.012 + 0.05 * t;
      left.push(mid.clone().addScaledVector(side, w));
      right.push(mid.clone().addScaledVector(side, -w));
    }
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= steps; i++) {
      pos.push(left[i].x, left[i].y, left[i].z, right[i].x, right[i].y, right[i].z);
      if (i < steps) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const ribbon = new THREE.Mesh(
      g,
      new THREE.MeshBasicMaterial({
        color: 0xf49a6b,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    ribbon.userData.name = "ribbon";
    earthGroup.add(ribbon);
    (earthGroup as THREE.Group & { ribbon: THREE.Mesh }).ribbon = ribbon;
  }
  const ribbon = (earthGroup as THREE.Group & { ribbon: THREE.Mesh }).ribbon;

  /* --- inversion lid ------------------------------------------------- */
  const invGroup = new THREE.Group();
  const lidTexture = makeRadialTexture(
    "rgba(244,154,107,0.5)",
    "rgba(244,154,107,0.16)",
  );
  const lidMat = new THREE.MeshBasicMaterial({
    map: lidTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lid = new THREE.Mesh(new THREE.CircleGeometry(0.17, 48), lidMat);
  const lidRingMat = new THREE.MeshBasicMaterial({
    color: 0xf49a6b,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lidRing = new THREE.Mesh(new THREE.RingGeometry(0.163, 0.17, 64), lidRingMat);
  const lidLabel = makeLabelSprite(
    "INVERSION LID · ≈ 600 M AGL",
    "rgba(244,154,107,0.95)",
    [0.36, 0.045],
  );
  invGroup.add(lid, lidRing, lidLabel);
  // local frame: +Z points along the surface normal (outward, toward sky)
  invGroup.position.copy(delhiN);
  invGroup.lookAt(new THREE.Vector3(0, 0, 0));
  lidLabel.position.set(0.24, 0, 0);
  earthGroup.add(invGroup);

  /* blocked vertical mixing (arrows rising, dying at the lid) */
  const mixCount = 12;
  const mixPos = new Float32Array(mixCount * 3);
  const mixAlpha = new Float32Array(mixCount);
  const mixCols: THREE.Vector3[] = [];
  {
    const offsets = [
      [0.35, 0.4], [-0.4, 0.3], [0.3, -0.45],
    ];
    const up = new THREE.Vector3(0, 1, 0);
    offsets.forEach((o, ci) => {
      const base = latLngToVec3(DELHI.lat + o[0], DELHI.lng + o[1], 1);
      const side = new THREE.Vector3().crossVectors(up, base).normalize();
      for (let k = 0; k < 4; k++) {
        mixCols.push(base.clone().addScaledVector(side, (k - 1.5) * 0.02));
      }
    });
  }
  const mixGeom = new THREE.BufferGeometry();
  mixGeom.setAttribute("position", new THREE.BufferAttribute(mixPos, 3));
  mixGeom.setAttribute("aA", new THREE.BufferAttribute(mixAlpha, 1));
  const mixMat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aA;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = aA;
        gl_PointSize = (120.0 / -mv.z) * 0.1;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(vec3(0.96, 0.6, 0.42), a * vA * uOpacity);
      }`,
    uniforms: { uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mixPoints = new THREE.Points(mixGeom, mixMat);
  earthGroup.add(mixPoints);

  /* --- neighborhood resolution --------------------------------------- */
  const nbGroup = new THREE.Group();
  const nbTexture = makeRadialTexture(
    "rgba(208,238,145,0.5)",
    "rgba(208,238,145,0.12)",
  );
  const nbMat = new THREE.MeshBasicMaterial({
    map: nbTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const nbDisc = new THREE.Mesh(new THREE.CircleGeometry(0.085, 48), nbMat);
  nbDisc.position.copy(delhiN.clone().multiplyScalar(1.003));
  nbDisc.lookAt(delhiN.clone().multiplyScalar(3));
  const nbRingMat = new THREE.MeshBasicMaterial({
    color: 0xd0ee91,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const nbRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.97, 64), nbRingMat);
  nbRing.position.copy(delhiN.clone().multiplyScalar(1.004));
  nbRing.lookAt(delhiN.clone().multiplyScalar(3));
  nbGroup.add(nbDisc, nbRing);
  earthGroup.add(nbGroup);

  /* --- camera path --------------------------------------------------- */
  const camKeys: Array<[number, number, number]> = [
    [21, 73, 3.3],
    [23.5, 74.5, 2.9],
    [26, 75.5, 2.35],
    [29.6, 75.1, 1.72],
    [29.1, 76.3, 1.55],
    [28.85, 76.85, 1.44],
    [28.62, 77.08, 1.3],
    [28.62, 77.15, 1.2],
    [28.65, 77.1, 1.115],
    [28.63, 77.19, 1.08],
  ];
  const camCurve = new THREE.CatmullRomCurve3(
    camKeys.map(([lat, lng, d]) => latLngToVec3(lat, lng, d)),
    false,
    "catmullrom",
    0.5,
  );

  /* --- state --------------------------------------------------------- */
  let progress = 0;
  let time = 0;
  let raf = 0;
  let disposed = false;
  let lastInfo = 0;
  const clock = new THREE.Clock();
  const camWorld = new THREE.Vector3();
  const tmpV = new THREE.Vector3();

  function updateCamera() {
    const rotY = 0.18 * (1 - smooth(progress, 0, 0.16));
    camWorld.copy(camCurve.getPoint(THREE.MathUtils.clamp(progress, 0, 1)));
    camWorld.applyAxisAngle(Y_AXIS, rotY);
    if (!opts.reducedMotion) {
      camWorld.x += 0.006 * Math.sin(time * 0.11);
      camWorld.y += 0.004 * Math.sin(time * 0.07);
    }
    camera.position.copy(camWorld);
    camera.lookAt(0, 0, 0);
  }

  function updateLayered() {
    const p = progress;
    const fOrbit = (1 - smooth(p, 0.15, 0.25)) * smooth(p, 0, 0.03);
    const fFire = smooth(p, 0.14, 0.24) * (1 - smooth(p, 0.36, 0.46));
    const fWind = smooth(p, 0.36, 0.46) * (1 - smooth(p, 0.58, 0.68));
    const fMark = smooth(p, 0.36, 0.46);
    const fInv = smooth(p, 0.6, 0.7) * (1 - smooth(p, 0.84, 0.92));
    const fNb = smooth(p, 0.86, 0.97);

    swathMat.opacity = 0.13 * fOrbit * (0.8 + 0.2 * Math.sin(time * 1.4));
    (swathTop.material as THREE.MeshBasicMaterial).opacity = 0.4 * fOrbit;
    (swathBottom.material as THREE.MeshBasicMaterial).opacity = 0.4 * fOrbit;
    const scanLat = 25 + 9.5 * Math.sin(time * 0.35);
    const cl = Math.cos(scanLat * D2R);
    scanRing.scale.set(cl, 1, cl);
    scanRing.position.y = Math.sin(scanLat * D2R);
    scanRingMat.opacity = 0.55 * fOrbit;
    satGroup.visible = fOrbit > 0.01;
    beam.visible = fOrbit > 0.01;
    beamMat.opacity = 0.25 * fOrbit;
    atmoMat.uniforms.uOpacity.value = 0.8 + 0.3 * smooth(p, 0.4, 1);

    fireClustersMat.uniforms.uTime.value = time;
    fireDetectionsMat.uniforms.uTime.value = time;
    fireClustersMat.uniforms.uOpacity.value = 0.95 * fFire;
    fireDetectionsMat.uniforms.uOpacity.value = 0.5 * fFire;

    const mku = markerGroup.userData as {
      ringMat: THREE.MeshBasicMaterial;
      dotMat: THREE.MeshBasicMaterial;
      labelMat: THREE.SpriteMaterial;
    };
    mku.ringMat.opacity = 0.9 * fMark;
    mku.dotMat.opacity = 0.9 * fMark;
    mku.labelMat.opacity = 0.9 * fMark;

    // wind particles
    windPoints.visible = fWind > 0.001;
    windMat.uniforms.uOpacity.value = fWind;
    if (windPoints.visible) {
      const delhiUnit = delhiN;
      for (let i = 0; i < windN; i++) {
        const m = windMeta[i];
        const t = (m.t0 + time * m.spd) % 1;
        windT[i] = t;
        const a = m.src;
        const b = delhiUnit;
        // slerp on unit sphere
        const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
        const omega = Math.acos(dot);
        const sa = Math.sin((1 - t) * omega) / (omega || 1);
        const sb = Math.sin(t * omega) / (omega || 1);
        const lift =
          1.004 + 0.05 * Math.sin(Math.PI * t) + 0.006 * Math.sin(time * 2 + m.wob);
        tmpV
          .copy(a)
          .multiplyScalar(sa)
          .addScaledVector(b, sb)
          .normalize()
          .multiplyScalar(lift);
        windPos.set([tmpV.x, tmpV.y, tmpV.z], i * 3);
      }
      windGeom.attributes.position.needsUpdate = true;
      windGeom.attributes.aT.needsUpdate = true;
    }
    cometMat.uniforms.uTime.value = time;
    cometMat.uniforms.uOpacity.value = fWind;
    comets.visible = fWind > 0.001;
    (ribbon.material as THREE.MeshBasicMaterial).opacity = 0.055 * fWind;
    ribbon.visible = fWind > 0.001;

    // inversion — local +Z points along the surface normal (toward sky)
    const lidF = smooth(p, 0.6, 0.72);
    const lidH = 0.09 + (1 - lidF) * 0.05;
    invGroup.scale.setScalar(1.12 - 0.12 * lidF);
    lidMat.opacity = 0.85 * fInv;
    lidRingMat.opacity = 0.7 * fInv;
    (lidLabel.material as THREE.SpriteMaterial).opacity = 0.9 * fInv;
    lid.position.z = lidH;
    lidRing.position.z = lidH;
    lidLabel.position.z = lidH;
    invGroup.visible = fInv > 0.001;

    mixMat.uniforms.uOpacity.value = fInv;
    mixPoints.visible = fInv > 0.001;
    if (mixPoints.visible) {
      for (let i = 0; i < mixCount; i++) {
        const h = (time * 0.11 + (i % 4) * 0.25 + Math.floor(i / 4) * 0.07) % 1;
        const base = mixCols[i];
        tmpV.copy(base).multiplyScalar(1.004 + h * (lidH - 0.012));
        mixPos.set([tmpV.x, tmpV.y, tmpV.z], i * 3);
        mixAlpha[i] = Math.pow(1 - h, 1.6) * 0.9;
      }
      mixGeom.attributes.position.needsUpdate = true;
      mixGeom.attributes.aA.needsUpdate = true;
    }

    // neighborhood
    nbMat.opacity = 0.5 * fNb;
    const pulse = (time * 0.3) % 1;
    nbRing.scale.setScalar(0.02 + 0.05 * pulse);
    nbRingMat.opacity = (1 - pulse) * 0.55 * fNb;
    nbGroup.visible = fNb > 0.001;
  }

  function emitInfo() {
    const now = performance.now();
    if (now - lastInfo < 120 || !opts.onInfo) return;
    lastInfo = now;
    const local = camCurve.getPoint(THREE.MathUtils.clamp(progress, 0, 1));
    const { lat, lng } = vecToLatLng(local);
    opts.onInfo({
      progress,
      lat,
      lng,
      dist: local.length(),
      chapter: chapterFor(progress),
    });
  }

  function frame() {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    // (frame loop: camera scrub target is set via setProgress)
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    // satellite drifts along its orbit
    const theta = time * 0.22 + 1.1;
    satGroup.position.set(
      Math.cos(theta) * 1.16,
      0,
      Math.sin(theta) * 1.16,
    );
    satGroup.rotation.y = -theta;
    satGroup.getWorldPosition(tmpV);
    const arr = beamGeom.attributes.position.array as Float32Array;
    arr[0] = tmpV.x;
    arr[1] = tmpV.y;
    arr[2] = tmpV.z;
    tmpV.normalize();
    arr[3] = tmpV.x * 1.006;
    arr[4] = tmpV.y * 1.006;
    arr[5] = tmpV.z * 1.006;
    beamGeom.attributes.position.needsUpdate = true;

    updateCamera();
    updateLayered();
    renderer.render(scene, camera);
    emitInfo();
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  window.addEventListener("resize", onResize);
  const onLost = (e: Event) => {
    e.preventDefault();
    opts.onContextLost?.();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  let staticRendered = false;

  const handles: GlobeHandles = {
    setProgress(p: number) {
      progress = p;
      if (opts.reducedMotion && staticRendered) {
        updateCamera();
        updateLayered();
        renderer.render(scene, camera);
      }
    },
    setStaticFrame(p: number) {
      progress = p;
      time = 2.2; // a pleasing mid-state for pulses/scanline
      staticRendered = true;
      updateCamera();
      updateLayered();
      renderer.render(scene, camera);
      emitInfo();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onLost);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as { material?: THREE.Material | THREE.Material[] })
          .material;
        if (Array.isArray(mat)) mat.forEach((m) => disposeMat(m));
        else if (mat) disposeMat(mat);
      });
      tex.dispose();
      renderer.dispose();
    },
  };

  function disposeMat(m: THREE.Material) {
    const anyM = m as THREE.Material & { map?: THREE.Texture | null };
    if (anyM.map) anyM.map.dispose();
    m.dispose();
  }

  if (opts.reducedMotion) {
    // single static frame; SceneCanvas calls setStaticFrame with its p
    staticRendered = false;
  } else {
    frame();
  }

  return handles;
}

export { CHAPTER_NAMES };
