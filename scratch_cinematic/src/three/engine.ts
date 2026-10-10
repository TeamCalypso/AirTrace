import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import {
  atmosphereFrag,
  atmosphereVert,
  flowFrag,
  flowVert,
  globeFrag,
  globeVert,
  lidFrag,
  lidVert,
  pointFrag,
  pointVert,
  plumeFrag,
  plumeVert,
  swathFrag,
  swathVert,
} from "./shaders";
import { buildGlowSprite, buildLandMask, buildNightLights, buildRegionLinePositions } from "./textures";
import regionJson from "@/data/region.json";
import { CORRIDORS, getDelhiFootprint, getFires, windAt, windField } from "@/lib/scene-data";
import { DEG, clamp, hashSeed, latLngToVec3, lerp, rng, smoothstep } from "@/lib/geo";
import { LABELS } from "@/lib/labels";

const R = 1;
const EARTH_M = 6371000;
const DELHI = { lat: 28.6139, lng: 77.209 };
const VIIRS_PASS_COUNT = 4;

export type SceneParams = {
  targetLat: number;
  targetLng: number;
  altitude: number;
  elevation: number;
  azimuth: number;
  roll: number;
  fov: number;
  exposure: number;
  nightMix: number;
  grid: number;
  borderGlow: number;
  haze: number;
  swathProgress: number;
  swathOpacity: number;
  orbitOpacity: number;
  fireReveal: number;
  fireScale: number;
  windOpacity: number;
  windFlow: number;
  plumeDensity: number;
  plumeMotion: number;
  lidHeight: number;
  lidOpacity: number;
  cityGlow: number;
  pinOpacity: number;
  labelOrbit: number;
  labelRegion: number;
  labelCity: number;
};

const BASE: SceneParams = {
  targetLat: 10,
  targetLng: 76,
  altitude: 3.3,
  elevation: 8,
  azimuth: 170,
  roll: 0,
  fov: 40,
  exposure: 1.05,
  nightMix: 1,
  grid: 0.3,
  borderGlow: 0,
  haze: 0,
  swathProgress: 0,
  swathOpacity: 0,
  orbitOpacity: 0,
  fireReveal: 0,
  fireScale: 1,
  windOpacity: 0,
  windFlow: 1,
  plumeDensity: 0,
  plumeMotion: 1,
  lidHeight: 2400,
  lidOpacity: 0,
  cityGlow: 0.25,
  pinOpacity: 0,
  labelOrbit: 1,
  labelRegion: 0,
  labelCity: 0,
};

/** Camera + layer keyframes along the scroll (0 -> 1). */
const TRACK: { at: number; v: Partial<SceneParams> }[] = [
  { at: 0.0, v: { targetLat: 4, targetLng: 80, altitude: 3.4, elevation: 3, azimuth: 168, fov: 40, grid: 0.34, nightMix: 1, cityGlow: 0.3, haze: 0.05, labelOrbit: 1 } },
  { at: 0.1, v: { targetLat: 13, targetLng: 76, altitude: 2.8, elevation: 10, azimuth: 172, fov: 39, grid: 0.3, haze: 0.12, swathOpacity: 0.85, orbitOpacity: 1, swathProgress: 0.05 } },
  { at: 0.18, v: { targetLat: 17, targetLng: 74, altitude: 2.2, elevation: 16, azimuth: 176, fov: 38, grid: 0.26, haze: 0.18, swathOpacity: 1, orbitOpacity: 1, swathProgress: 0.55 } },
  { at: 0.29, v: { targetLat: 22, targetLng: 74.6, altitude: 1.5, elevation: 26, azimuth: 178, fov: 36, grid: 0.2, borderGlow: 0.4, haze: 0.3, swathOpacity: 0, orbitOpacity: 0.2, swathProgress: 1.35, labelOrbit: 0.2, labelRegion: 0.5, fireReveal: 0 } },
  { at: 0.36, v: { targetLat: 29.6, targetLng: 75.4, altitude: 0.17, elevation: 66, azimuth: 178, fov: 34, fireReveal: 0.55, borderGlow: 1, grid: 0.12, haze: 0.4, labelRegion: 1, labelOrbit: 0 } },
  { at: 0.46, v: { targetLat: 29.7, targetLng: 75.9, altitude: 0.145, elevation: 54, azimuth: 176, fov: 34, fireReveal: 1, borderGlow: 1, grid: 0.1, haze: 0.45, labelRegion: 1 } },
  { at: 0.55, v: { targetLat: 29.2, targetLng: 76.4, altitude: 0.115, elevation: 44, azimuth: 174, fov: 35, fireReveal: 1, windOpacity: 0.9, plumeDensity: 0.7, haze: 0.55, labelRegion: 1, labelCity: 0.25 } },
  { at: 0.69, v: { targetLat: 28.8, targetLng: 77.05, altitude: 0.08, elevation: 32, azimuth: 171, fov: 36, fireReveal: 1, windOpacity: 0.9, plumeDensity: 1, haze: 0.72, labelRegion: 1, labelCity: 0.6 } },
  { at: 0.79, v: { targetLat: 28.65, targetLng: 77.19, altitude: 0.032, elevation: 25, azimuth: 168, fov: 37, fireReveal: 0.9, windOpacity: 0.5, plumeDensity: 1, haze: 0.9, lidOpacity: 0.8, lidHeight: 1500, cityGlow: 0.85, labelRegion: 0.7, labelCity: 1 } },
  { at: 0.88, v: { targetLat: 28.63, targetLng: 77.21, altitude: 0.024, elevation: 20, azimuth: 166, fov: 35, fireReveal: 0.8, windOpacity: 0.25, plumeDensity: 1, haze: 1, lidOpacity: 1, lidHeight: 150, cityGlow: 1, labelRegion: 0.4, labelCity: 1 } },
  { at: 0.94, v: { targetLat: 28.62, targetLng: 77.22, altitude: 0.021, elevation: 18, azimuth: 165, fov: 33, fireReveal: 0.7, windOpacity: 0.18, plumeDensity: 0.95, haze: 1, lidOpacity: 1, lidHeight: 140, cityGlow: 1, pinOpacity: 1, labelCity: 1 } },
  { at: 1.0, v: { targetLat: 28.62, targetLng: 77.23, altitude: 0.019, elevation: 16, azimuth: 164, fov: 32, fireReveal: 0.6, windOpacity: 0.15, plumeDensity: 0.9, haze: 1, lidOpacity: 1, lidHeight: 135, cityGlow: 1, pinOpacity: 1, labelCity: 1 } },
];

const _v = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _north = new THREE.Vector3();
const _east = new THREE.Vector3();
const _target = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();

function basisAt(lat: number, lng: number, out: { up: THREE.Vector3; north: THREE.Vector3; east: THREE.Vector3; pos: THREE.Vector3 }) {
  out.pos.set(...latLngToVec3(lat, lng, R));
  out.up.copy(out.pos).normalize();
  out.north.copy(_up).sub(_tmp.copy(out.up).multiplyScalar(_up.dot(out.up))).normalize();
  out.east.copy(_tmp2.copy(out.north).cross(out.up)).normalize();
  return out;
}

const basis = { up: new THREE.Vector3(), north: new THREE.Vector3(), east: new THREE.Vector3(), pos: new THREE.Vector3() };

export class JourneyEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;

  private globeMat!: THREE.ShaderMaterial;
  private borderLines!: THREE.LineSegments;
  private atmoMat!: THREE.ShaderMaterial;
  private swathMat!: THREE.ShaderMaterial;
  private orbitLine!: THREE.Line;
  private satSprite!: THREE.Sprite;
  private fireMat!: THREE.ShaderMaterial;
  private windMat!: THREE.ShaderMaterial;
  private plumeMat!: THREE.ShaderMaterial;
  private cityMat!: THREE.ShaderMaterial;
  private lidMat!: THREE.ShaderMaterial;
  private pinGroup = new THREE.Group();
  private pinRing!: THREE.Mesh;
  private pinBeam!: THREE.Mesh;
  private pinDot!: THREE.Sprite;

  private plumePos!: Float32Array;
  private plumeData!: Float32Array; // lat, lng, altM, age
  private plumeSrc!: Int32Array;
  private plumeCount = 3800;
  private plumePoints!: THREE.Points;
  private fires = getFires();
  private params: SceneParams = { ...BASE };
  private progress = 0;
  private smoothed = { lat: 6, lng: 78, alt: 3.35, el: 4, az: 168, fov: 40 };
  private labelNodes = new Map<string, HTMLElement>();
  private labelLayer: HTMLElement | null = null;
  private pin: { lat: number; lng: number; label: string } | null = null;
  private projScale = 800;
  onFirstFrame?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x02040a, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = BASE.exposure;

    this.camera = new THREE.PerspectiveCamera(BASE.fov, 1, 0.0006, 200);
    this.scene.add(this.camera);

    this.buildStars();
    this.buildGlobe();
    this.buildSwath();
    this.buildFires();
    this.buildWind();
    this.buildPlume();
    this.buildCity();
    this.buildLid();
    this.buildPin();
    this.buildComposer();
    this.resize();
    this.loop();
  }

  // ---------------------------------------------------------------- build ---
  private buildStars() {
    const next = rng(hashSeed("stars"));
    const N = 2400;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = next() * 2 - 1;
      const t = next() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const d = 60 + next() * 40;
      pos[i * 3] = Math.cos(t) * r * d;
      pos[i * 3 + 1] = u * d;
      pos[i * 3 + 2] = Math.sin(t) * r * d;
      const warm = next();
      col[i * 3] = 0.7 + warm * 0.3;
      col[i * 3 + 1] = 0.75 + next() * 0.25;
      col[i * 3 + 2] = 0.85 + (1 - warm) * 0.15;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.42,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.scene.add(new THREE.Points(geo, mat));
  }

  private buildGlobe() {
    const land = buildLandMask();
    const lights = buildNightLights();

    const sunDir = new THREE.Vector3(...latLngToVec3(6, 52, 1)).normalize();
    this.globeMat = new THREE.ShaderMaterial({
      vertexShader: globeVert,
      fragmentShader: globeFrag,
      uniforms: {
        uLand: { value: land },
        uLights: { value: lights },
        uBorders: { value: land },
        uSun: { value: sunDir },
        uBorderGlow: { value: 0 },
        uGrid: { value: BASE.grid },
        uHaze: { value: 0 },
        uHazeCenter: { value: new THREE.Vector2((77 + 180) / 360, (90 - 29) / 180) },
        uTime: { value: 0 },
        uNightMix: { value: 1 },
        uOceanDeep: { value: new THREE.Color("#03060f") },
        uOceanShallow: { value: new THREE.Color("#0a1c33") },
        uLandLow: { value: new THREE.Color("#0d1725") },
        uLandHigh: { value: new THREE.Color("#3a4a5c") },
      },
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 180, 110), this.globeMat);
    this.scene.add(globe);

    this.atmoMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVert,
      fragmentShader: atmosphereFrag,
      uniforms: {
        uSun: { value: sunDir },
        uColor: { value: new THREE.Color("#4a9bff") },
        uIntensity: { value: 1.15 },
        uPower: { value: 3.1 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const borderGeo = new THREE.BufferGeometry();
    borderGeo.setAttribute("position", new THREE.Float32BufferAttribute(buildRegionLinePositions(), 3));
    this.borderLines = new THREE.LineSegments(
      borderGeo,
      new THREE.LineBasicMaterial({ color: 0x7fe4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.scene.add(this.borderLines);
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.055, 96, 64), this.atmoMat));
    const outerAtmo = this.atmoMat.clone();
    outerAtmo.uniforms.uIntensity.value = 0.55;
    outerAtmo.uniforms.uPower.value = 4.2;
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.16, 64, 48), outerAtmo));
  }

  private buildSwath() {
    // ground track: great circle from the Arabian Sea up over the Himalaya
    const a = new THREE.Vector3(...latLngToVec3(-18, 54, 1)).normalize();
    const b = new THREE.Vector3(...latLngToVec3(56, 104, 1)).normalize();
    const normal = new THREE.Vector3().crossVectors(a, b).normalize();
    const b2 = new THREE.Vector3().crossVectors(normal, a).normalize();
    const ALONG = 140;
    const ACROSS = 7;
    const halfWidth = 0.115; // ~1300 km each side => 2600 km swath
    const positions = new Float32Array(ALONG * ACROSS * 3);
    const uvs = new Float32Array(ALONG * ACROSS * 2);
    const indices: number[] = [];
    let p = 0;
    let q = 0;
    for (let i = 0; i < ALONG; i++) {
      const t = (i / (ALONG - 1)) * 1.35 - 0.12;
      const nadir = new THREE.Vector3().copy(a).multiplyScalar(Math.cos(t)).add(_tmp.copy(b2).multiplyScalar(Math.sin(t)));
      const across = new THREE.Vector3().crossVectors(normal, nadir).normalize();
      for (let j = 0; j < ACROSS; j++) {
        const w = (j / (ACROSS - 1) - 0.5) * 2 * halfWidth;
        const v = new THREE.Vector3()
          .copy(nadir)
          .add(_tmp.copy(across).multiplyScalar(w))
          .normalize()
          .multiplyScalar(R * 1.004);
        positions[p++] = v.x;
        positions[p++] = v.y;
        positions[p++] = v.z;
        uvs[q++] = i / (ALONG - 1);
        uvs[q++] = j / (ACROSS - 1);
      }
    }
    for (let i = 0; i < ALONG - 1; i++) {
      for (let j = 0; j < ACROSS - 1; j++) {
        const s = i * ACROSS + j;
        indices.push(s, s + ACROSS, s + 1, s + 1, s + ACROSS, s + ACROSS + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    this.swathMat = new THREE.ShaderMaterial({
      vertexShader: swathVert,
      fragmentShader: swathFrag,
      uniforms: {
        uProgress: { value: 0 },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#7fd7ff") },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.scene.add(new THREE.Mesh(geo, this.swathMat));

    // orbit trace
    const trace: number[] = [];
    for (let i = 0; i <= 260; i++) {
      const t = (i / 260) * Math.PI * 2;
      const v = new THREE.Vector3().copy(a).multiplyScalar(Math.cos(t)).add(_tmp.copy(b2).multiplyScalar(Math.sin(t))).multiplyScalar(R * 1.26);
      trace.push(v.x, v.y, v.z);
    }
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute("position", new THREE.Float32BufferAttribute(trace, 3));
    this.orbitLine = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: 0x66d9ff, transparent: true, opacity: 0 }));
    this.scene.add(this.orbitLine);

    const sprite = buildGlowSprite(2.8);
    this.satSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xd9f6ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.satSprite.scale.setScalar(0.055);
    this.satSprite.material.opacity = 0;
    this.scene.add(this.satSprite);
  }

  private buildFires() {
    const sprite = buildGlowSprite(2.6);
    const N = this.fires.length;
    const pos = new Float32Array(N * 3);
    const birth = new Float32Array(N);
    const size = new Float32Array(N);
    const seed = new Float32Array(N);
    const col = new Float32Array(N * 3);
    const next = rng(hashSeed("fire-colors"));
    this.fires.forEach((f, i) => {
      const v = latLngToVec3(f.lat, f.lng, R * 1.0015);
      pos[i * 3] = v[0];
      pos[i * 3 + 1] = v[1];
      pos[i * 3 + 2] = v[2];
      birth[i] = f.pass / VIIRS_PASS_COUNT + (i / N) * 0.22;
      size[i] = 0.0016 + Math.min(0.0034, f.frp * 0.000016);
      seed[i] = next();
      const heat = clamp(f.frp / 26, 0, 1);
      col[i * 3] = 1.0;
      col[i * 3 + 1] = 0.32 + heat * 0.55;
      col[i * 3 + 2] = 0.12 + heat * 0.32;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aBirth", new THREE.BufferAttribute(birth, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    this.fireMat = new THREE.ShaderMaterial({
      vertexShader: pointVert,
      fragmentShader: pointFrag,
      uniforms: {
        uMap: { value: sprite },
        uReveal: { value: 0 },
        uTime: { value: 0 },
        uScale: { value: 900 },
        uPulse: { value: 1 },
        uSizeBoost: { value: 1 },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.scene.add(new THREE.Points(geo, this.fireMat));
  }

  private buildWind() {
    const samples = windField(3.2);
    const pos: number[] = [];
    const aT: number[] = [];
    const aLen: number[] = [];
    const dir = new THREE.Vector3();
    const perp = new THREE.Vector3();
    for (const s of samples) {
      const [x, y, z] = latLngToVec3(s.lat, s.lng, R * 1.004);
      basisAt(s.lat, s.lng, basis);
      const dirTo = (s.dirFrom + 180) * DEG;
      dir
        .copy(basis.north)
        .multiplyScalar(Math.cos(dirTo))
        .addScaledVector(basis.east, Math.sin(dirTo))
        .normalize();
      const len = 0.012 + s.speed * 0.0075;
      const tail = new THREE.Vector3(x, y, z);
      const mid = tail.clone().addScaledVector(dir, len * 0.72);
      const tip = tail.clone().addScaledVector(dir, len);
      const headW = len * 0.26;
      const headL = len * 0.3;
      perp.copy(basis.up).cross(dir).normalize();
      const h1 = tip.clone().addScaledVector(perp, -headW).addScaledVector(dir, -headL);
      const h2 = tip.clone().addScaledVector(perp, headW).addScaledVector(dir, -headL);
      pos.push(tail.x, tail.y, tail.z, mid.x, mid.y, mid.z);
      aT.push(0, 0.72);
      aLen.push(1, 1);
      pos.push(mid.x, mid.y, mid.z, tip.x, tip.y, tip.z);
      aT.push(0.72, 1);
      aLen.push(1, 1);
      pos.push(h1.x, h1.y, h1.z, tip.x, tip.y, tip.z);
      aT.push(0.78, 1);
      aLen.push(1, 1);
      pos.push(h2.x, h2.y, h2.z, tip.x, tip.y, tip.z);
      aT.push(0.78, 1);
      aLen.push(1, 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1));
    geo.setAttribute("aLen", new THREE.Float32BufferAttribute(aLen, 1));
    this.windMat = new THREE.ShaderMaterial({
      vertexShader: flowVert,
      fragmentShader: flowFrag,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0.35 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color("#59e0ff") },
        uDash: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.scene.add(new THREE.LineSegments(geo, this.windMat));

    // faint corridor circuitry
    const cPos: number[] = [];
    for (const line of CORRIDORS) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = latLngToVec3(line[i][0], line[i][1], R * 1.0022);
        const b = latLngToVec3(line[i + 1][0], line[i + 1][1], R * 1.0022);
        cPos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      }
    }
    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute("position", new THREE.Float32BufferAttribute(cPos, 3));
    this.scene.add(
      new THREE.LineSegments(
        cGeo,
        new THREE.LineBasicMaterial({ color: 0x2f7fa8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
      )
    );
  }

  private buildPlume() {
    const sprite = buildGlowSprite(1.8);
    const N = this.plumeCount;
    this.plumePos = new Float32Array(N * 3);
    this.plumeData = new Float32Array(N * 4);
    this.plumeSrc = new Int32Array(N);
    const size = new Float32Array(N);
    const alpha = new Float32Array(N);
    const col = new Float32Array(N * 3);
    const next = rng(hashSeed("plume-init"));
    for (let i = 0; i < N; i++) {
      this.plumeSrc[i] = Math.floor(next() * this.fires.length);
      const f = this.fires[this.plumeSrc[i]];
      this.plumeData[i * 4] = f.lat;
      this.plumeData[i * 4 + 1] = f.lng;
      this.plumeData[i * 4 + 2] = 200 + next() * 400;
      this.plumeData[i * 4 + 3] = next();
      size[i] = 0.006 + next() * 0.01;
      alpha[i] = 0.25 + next() * 0.4;
      col[i * 3] = 0.62;
      col[i * 3 + 1] = 0.55;
      col[i * 3 + 2] = 0.48;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.plumePos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.plumeMat = new THREE.ShaderMaterial({
      vertexShader: plumeVert,
      fragmentShader: plumeFrag,
      uniforms: {
        uMap: { value: sprite },
        uScale: { value: 900 },
        uGlobalAlpha: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.plumePoints = new THREE.Points(geo, this.plumeMat);
    this.scene.add(this.plumePoints);
  }

  private buildCity() {
    const sprite = buildGlowSprite(2.2);
    const footprint = getDelhiFootprint();
    const N = footprint.length / 2;
    const pos = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const seed = new Float32Array(N);
    const col = new Float32Array(N * 3);
    const birth = new Float32Array(N);
    const next = rng(hashSeed("city-pts"));
    for (let i = 0; i < N; i++) {
      const v = latLngToVec3(footprint[i * 2 + 1], footprint[i * 2], R * 1.0008);
      pos[i * 3] = v[0];
      pos[i * 3 + 1] = v[1];
      pos[i * 3 + 2] = v[2];
      size[i] = 0.0012 + next() * 0.0026;
      seed[i] = next();
      birth[i] = 0;
      const warm = next();
      col[i * 3] = 1;
      col[i * 3 + 1] = 0.78 + warm * 0.16;
      col[i * 3 + 2] = 0.52 + warm * 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aBirth", new THREE.BufferAttribute(birth, 1));
    this.cityMat = new THREE.ShaderMaterial({
      vertexShader: pointVert,
      fragmentShader: pointFrag,
      uniforms: {
        uMap: { value: sprite },
        uReveal: { value: 1 },
        uTime: { value: 0 },
        uScale: { value: 900 },
        uPulse: { value: 0.4 },
        uSizeBoost: { value: 0.6 },
        uOpacity: { value: 0.2 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, this.cityMat);
    this.scene.add(pts);
  }

  private buildLid() {
    this.lidMat = new THREE.ShaderMaterial({
      vertexShader: lidVert,
      fragmentShader: lidFrag,
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#9fd8ff") },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), this.lidMat);
    disc.scale.setScalar(0.036); // ~230 km across, the whole NCR
    basisAt(DELHI.lat, DELHI.lng, basis);
    disc.position.copy(basis.pos).addScaledVector(basis.up, 0.004);
    disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), basis.up);
    this.scene.add(disc);
    this.lidDisc = disc;
  }
  private lidDisc!: THREE.Mesh;

  private buildPin() {
    const sprite = buildGlowSprite(2.4);
    this.pinDot = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sprite, color: 0x8ff0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })
    );
    this.pinDot.scale.setScalar(0.006);
    this.pinRing = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1, 64),
      new THREE.MeshBasicMaterial({ color: 0x8ff0ff, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.pinBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.00035, 0.00035, 1, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x8ff0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.pinGroup.add(this.pinDot, this.pinRing, this.pinBeam);
    this.pinGroup.visible = false;
    this.scene.add(this.pinGroup);
  }

  private buildComposer() {
    try {
      const composer = new EffectComposer(this.renderer);
      composer.addPass(new RenderPass(this.scene, this.camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(this.renderer.domElement.clientWidth || 1280, this.renderer.domElement.clientHeight || 720), 1.05, 0.72, 0.14);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      this.composer = composer;
    } catch {
      this.composer = null;
    }
  }

  // ---------------------------------------------------------------- public ---
  attachLabelLayer(el: HTMLElement | null) {
    this.labelLayer = el;
    this.labelNodes.clear();
    if (!el) return;
    el.querySelectorAll<HTMLElement>("[data-label]").forEach((node) => {
      this.labelNodes.set(node.dataset.label ?? "", node);
    });
  }

  setProgress(p: number) {
    this.progress = clamp(p, 0, 1);
  }

  setPin(lat: number, lng: number, label: string) {
    this.pin = { lat, lng, label };
    this.pinGroup.visible = true;
    basisAt(lat, lng, basis);
    this.pinGroup.position.copy(basis.pos);
    this.pinRing.position.copy(basis.pos).addScaledVector(basis.up, 0.0006);
    this.pinRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), basis.up);
    this.pinBeam.position.copy(basis.pos).addScaledVector(basis.up, 0.004);
    this.pinBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), basis.up);
    this.pinBeam.scale.set(1, 0.008, 1);
  }

  clearPin() {
    this.pin = null;
    this.pinGroup.visible = false;
  }

  /** Live camera telemetry for the HUD. */
  telemetry() {
    return {
      altitudeKm: this.smoothed.alt * EARTH_M / 1000,
      lat: this.smoothed.lat,
      lng: this.smoothed.lng,
      elevation: this.smoothed.el,
      fov: this.smoothed.fov,
      progress: this.progress,
    };
  }

  resize() {
    const w = this.renderer.domElement.clientWidth || window.innerWidth;
    const h = this.renderer.domElement.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.composer?.dispose();
    this.renderer.dispose();
  }

  // ----------------------------------------------------------------- loop ---
  private sampleTrack(p: number): SceneParams {
    let i = 0;
    while (i < TRACK.length - 2 && p > TRACK[i + 1].at) i++;
    const a = TRACK[i];
    const b = TRACK[i + 1] ?? TRACK[i];
    const span = Math.max(1e-6, b.at - a.at);
    const raw = clamp((p - a.at) / span, 0, 1);
    const t = smoothstep(raw);
    const out = { ...this.params };
    for (const key of Object.keys(BASE) as (keyof SceneParams)[]) {
      const av = a.v[key] ?? this.params[key];
      const bv = b.v[key] ?? av;
      out[key] = lerp(av, bv, t);
    }
    return out;
  }

  private updateCamera(dt: number) {
    const k = 1 - Math.pow(0.0015, dt);
    this.smoothed.lat = lerp(this.smoothed.lat, this.params.targetLat, k);
    this.smoothed.lng = lerp(this.smoothed.lng, this.params.targetLng, k);
    this.smoothed.alt = lerp(this.smoothed.alt, this.params.altitude, k);
    this.smoothed.el = lerp(this.smoothed.el, this.params.elevation, k);
    this.smoothed.az = lerp(this.smoothed.az, this.params.azimuth, k);
    this.smoothed.fov = lerp(this.smoothed.fov, this.params.fov, k);

    basisAt(this.smoothed.lat, this.smoothed.lng, basis);
    _target.copy(basis.pos);

    const alt = Math.max(0.004, this.smoothed.alt);
    const el = this.smoothed.el * DEG;
    const az = this.smoothed.az * DEG;
    const horiz = Math.cos(el) * alt;
    _camPos
      .copy(_target)
      .addScaledVector(basis.up, Math.sin(el) * alt)
      .addScaledVector(basis.north, -Math.cos(az) * horiz)
      .addScaledVector(basis.east, -Math.sin(az) * horiz);

    const upBlend = clamp(1 - (alt - 0.02) / 0.5, 0, 1);
    _tmp.copy(_up).multiplyScalar(1 - upBlend).addScaledVector(basis.up, upBlend).normalize();
    this.camera.up.copy(_tmp);
    this.camera.position.copy(_camPos);
    this.camera.lookAt(_target);
    if (Math.abs(this.camera.fov - this.smoothed.fov) > 0.01) {
      this.camera.fov = this.smoothed.fov;
      this.camera.updateProjectionMatrix();
    }
    const h = this.renderer.domElement.clientHeight || window.innerHeight;
    this.projScale = (h * 0.5) / Math.tan(this.camera.fov * 0.5 * DEG);
  }

  private updatePlume(dt: number) {
    const speed = this.params.plumeMotion * (dt * 260); // sim minutes per real second
    const lid = this.params.lidHeight;
    const density = this.params.plumeDensity;
    const N = this.plumeCount;
    const visible = Math.floor(N * clamp(density, 0, 1));
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      let lat = this.plumeData[o];
      let lng = this.plumeData[o + 1];
      let altM = this.plumeData[o + 2];
      const age = this.plumeData[o + 3];
      if (i >= visible) {
        this.plumePos[i * 3 + 1] = 999;
        continue;
      }
      const w = windAt(lat, lng, 3.2);
      const kmh = w.speed * 3.6 * (speed / 60);
      const rad = w.dirFrom * DEG;
      const dLat = (-Math.cos(rad) * kmh) / 111.2;
      const dLng = (-Math.sin(rad) * kmh) / (111.2 * Math.max(0.25, Math.cos(lat * DEG)));
      lat += dLat;
      lng += dLng;
      // buoyant rise for the first 120 km, then ride the residual layer
      if (age < 0.35) altM += (1500 - altM) * 0.02 * (speed / 60);
      const dDelhi = Math.hypot(lat - DELHI.lat, (lng - DELHI.lng) * Math.cos(lat * DEG)) * 111;
      if (dDelhi < 90) altM = Math.min(altM, Math.max(60, lid * 1.15));
      this.plumeData[o] = lat;
      this.plumeData[o + 1] = lng;
      this.plumeData[o + 2] = altM;
      this.plumeData[o + 3] = Math.min(1, age + 0.0009 * speed);
      if (age > 0.985 || dDelhi > 780 || lat < 24.5) {
        const f = this.fires[this.plumeSrc[i]];
        this.plumeData[o] = f.lat;
        this.plumeData[o + 1] = f.lng;
        this.plumeData[o + 2] = 180 + (i % 40) * 22;
        this.plumeData[o + 3] = 0;
        this.plumePos[i * 3 + 1] = 999;
        continue;
      }
      const v = latLngToVec3(lat, lng, R + altM / EARTH_M);
      this.plumePos[i * 3] = v[0];
      this.plumePos[i * 3 + 1] = v[1];
      this.plumePos[i * 3 + 2] = v[2];
    }
    (this.plumePoints.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateLabels(time: number) {
    if (!this.labelLayer) return;
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const setLabel = (key: string, world: THREE.Vector3, opacity: number, text?: string, sub?: string) => {
      const node = this.labelNodes.get(key);
      if (!node) return;
      if (opacity <= 0.02) {
        node.style.opacity = "0";
        node.style.transform = "translate3d(-9999px,-9999px,0)";
        return;
      }
      _v.copy(world).project(this.camera);
      const x = (_v.x * 0.5 + 0.5) * w;
      const y = (-_v.y * 0.5 + 0.5) * h;
      const behind = _v.z > 1;
      const offscreen = x < -80 || x > w + 80 || y < -60 || y > h + 60;
      if (behind || offscreen) {
        node.style.opacity = "0";
        node.style.transform = "translate3d(-9999px,-9999px,0)";
        return;
      }
      node.style.opacity = String(opacity);
      node.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      if (text !== undefined && node.dataset.text !== text) {
        node.dataset.text = text;
        const title = node.querySelector<HTMLElement>("[data-title]");
        if (title) title.textContent = text;
      }
      if (sub !== undefined) {
        const subEl = node.querySelector<HTMLElement>("[data-sub]");
        if (subEl && subEl.dataset.sub !== sub) {
          subEl.dataset.sub = sub;
          subEl.textContent = sub;
        }
      }
    };

    for (const def of LABELS) {
      if (def.group === "dynamic") continue;
      const op = def.group === "orbit" ? this.params.labelOrbit : def.group === "region" ? this.params.labelRegion : this.params.labelCity;
      _tmp.set(...latLngToVec3(def.lat, def.lng, R + def.altM / EARTH_M));
      setLabel(def.key, _tmp, op);
    }

    // dynamic labels
    const satOp = this.params.orbitOpacity;
    if (satOp > 0.02) {
      _tmp.copy(this.satSprite.position);
      setLabel("l-sat", _tmp, satOp, "SENTINEL-5P", "824 km · 13:30 overpass");
    } else {
      setLabel("l-sat", _tmp.set(0, 0, 0), 0);
    }

    const lidOp = this.params.lidOpacity;
    if (lidOp > 0.02) {
      basisAt(DELHI.lat, DELHI.lng, basis);
      _tmp.copy(basis.pos).addScaledVector(basis.up, this.params.lidHeight / EARTH_M + 0.0004);
      setLabel("l-lid", _tmp, lidOp, "INVERSION LID", `${Math.round(this.params.lidHeight)} m above ground`);
    } else {
      setLabel("l-lid", _tmp.set(0, 0, 0), 0);
    }

    const plumeOp = this.params.plumeDensity * this.params.labelRegion;
    if (plumeOp > 0.05) {
      const t = 0.25 + 0.12 * Math.sin(time * 0.12);
      const [la, ln] = [29.35 - t * 1.1, 76.1 + t * 1.5];
      _tmp.set(...latLngToVec3(la, ln, R + 1600 / EARTH_M));
      setLabel("l-plume", _tmp, clamp(plumeOp, 0, 1), "PLUME FRONT", "10-14 h transit");
    } else {
      setLabel("l-plume", _tmp.set(0, 0, 0), 0);
    }

    if (this.pin) {
      const op = this.params.pinOpacity;
      basisAt(this.pin.lat, this.pin.lng, basis);
      _tmp.copy(basis.pos).addScaledVector(basis.up, 0.0018);
      setLabel("l-pin", _tmp, op, this.pin.label.toUpperCase(), `${this.pin.lat.toFixed(3)}°N ${this.pin.lng.toFixed(3)}°E`);
    } else {
      setLabel("l-pin", _tmp.set(0, 0, 0), 0);
    }
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const time = this.clock.elapsedTime;

    this.params = this.sampleTrack(this.progress);
    this.updateCamera(dt);
    this.updatePlume(dt);

    // ---- uniforms ----
    this.globeMat.uniforms.uTime.value = time;
    this.globeMat.uniforms.uGrid.value = this.params.grid;
    this.globeMat.uniforms.uBorderGlow.value = this.params.borderGlow;
    this.globeMat.uniforms.uHaze.value = this.params.haze;
    this.globeMat.uniforms.uNightMix.value = this.params.nightMix;

    (this.borderLines.material as THREE.LineBasicMaterial).opacity = this.params.borderGlow * 0.55;

    this.swathMat.uniforms.uTime.value = time;
    this.swathMat.uniforms.uProgress.value = this.params.swathProgress;
    this.swathMat.uniforms.uOpacity.value = this.params.swathOpacity;

    const orbitMat = this.orbitLine.material as THREE.LineBasicMaterial;
    orbitMat.opacity = this.params.orbitOpacity * 0.45;
    this.satSprite.material.opacity = this.params.orbitOpacity;
    const satT = this.params.swathProgress * 1.35 - 0.12;
    const a = new THREE.Vector3(...latLngToVec3(-18, 54, 1)).normalize();
    const b = new THREE.Vector3(...latLngToVec3(56, 104, 1)).normalize();
    const n = new THREE.Vector3().crossVectors(a, b).normalize();
    const b2 = new THREE.Vector3().crossVectors(n, a).normalize();
    this.satSprite.position
      .copy(a)
      .multiplyScalar(Math.cos(satT))
      .add(b2.clone().multiplyScalar(Math.sin(satT)))
      .multiplyScalar(R * 1.26);
    this.satSprite.scale.setScalar(0.04 + 0.02 * Math.sin(time * 3));

    this.fireMat.uniforms.uTime.value = time;
    this.fireMat.uniforms.uReveal.value = this.params.fireReveal;
    this.fireMat.uniforms.uScale.value = this.projScale;
    this.fireMat.uniforms.uSizeBoost.value = this.params.fireScale;

    this.windMat.uniforms.uTime.value = time;
    this.windMat.uniforms.uOpacity.value = this.params.windOpacity;

    this.plumeMat.uniforms.uScale.value = this.projScale;
    this.plumeMat.uniforms.uGlobalAlpha.value = 0.5;

    this.cityMat.uniforms.uTime.value = time;
    this.cityMat.uniforms.uScale.value = this.projScale;
    this.cityMat.uniforms.uOpacity.value = 0.12 + this.params.cityGlow * 0.85;

    this.lidMat.uniforms.uTime.value = time;
    this.lidMat.uniforms.uOpacity.value = this.params.lidOpacity;
    basisAt(DELHI.lat, DELHI.lng, basis);
    this.lidDisc.position.copy(basis.pos).addScaledVector(basis.up, this.params.lidHeight / EARTH_M);
    this.lidDisc.scale.setScalar(0.03 * (0.6 + 0.4 * clamp(this.params.lidHeight / 2400, 0, 1)));

    const pinOp = this.params.pinOpacity;
    const ringPulse = 0.6 + 0.4 * Math.sin(time * 2.2);
    (this.pinRing.material as THREE.MeshBasicMaterial).opacity = pinOp * 0.5 * ringPulse;
    this.pinRing.scale.setScalar(0.004 + 0.0022 * (1 - ringPulse * 0.5) + 0.0008 * Math.sin(time * 2.2));
    (this.pinBeam.material as THREE.MeshBasicMaterial).opacity = pinOp * 0.35;
    (this.pinDot.material as THREE.SpriteMaterial).opacity = pinOp;
    this.pinDot.scale.setScalar(0.004 + 0.0016 * ringPulse);

    this.renderer.toneMappingExposure = this.params.exposure;
    this.updateLabels(time);

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);

    if (!this.firstFrameDone) {
      this.firstFrameDone = true;
      this.onFirstFrame?.();
    }
  };
  private firstFrameDone = false;
}
