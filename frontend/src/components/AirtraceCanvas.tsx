'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { MOCK_FIRES } from '@/data/airtraceData';

// ─── Custom Shaders ────────────────────────────────────────────────────────────

// Point-cloud Earth vertex shader with elevation displacement
const EARTH_VERT = /* glsl */ `
  uniform float uSize;
  uniform sampler2D uElev;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying float vVisible;
  varying float vDist;

  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float elv = texture2D(uElev, vUv).r;
    vec3 n = normalMatrix * normal;
    vVisible = step(0.0, dot(-normalize(mv.xyz), normalize(n)));
    mv.z += 0.28 * elv;

    float d = distance(uMouse, vUv);
    vDist = d;
    if (d < 0.06) {
      mv.z += (0.06 - d) * 8.0;
    }

    gl_PointSize = uSize;
    gl_Position = projectionMatrix * mv;
  }
`;

// Point-cloud Earth fragment shader with night lights & India regional tint
const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uColor;
  uniform sampler2D uAlpha;
  uniform sampler2D uGlow;
  varying vec2 vUv;
  varying float vVisible;
  varying float vDist;

  void main() {
    if (floor(vVisible + 0.1) == 0.0) discard;

    float alpha = 1.0 - texture2D(uAlpha, vUv).r;
    vec3 col = texture2D(uColor, vUv).rgb;
    vec3 glow = texture2D(uGlow, vUv).rgb;

    // Field notes palette grading (deep forest teal tint)
    col = mix(col, vec3(0.06, 0.15, 0.13), 0.35);

    // Subtle highlight for Indo-Gangetic Plain (India region: U ≈ 0.71, V ≈ 0.56)
    float indU = smoothstep(0.67, 0.74, vUv.x) - smoothstep(0.74, 0.81, vUv.x);
    float indV = smoothstep(0.40, 0.49, vUv.y) - smoothstep(0.49, 0.60, vUv.y);
    float mask = indU * indV;
    col = mix(col, vec3(0.82, 0.93, 0.57), mask * 0.28); // Signal lime highlight

    // Mouse pointer interaction
    if (vDist < 0.06) {
      col = mix(col, glow, (0.06 - vDist) * 30.0);
    }

    gl_FragColor = vec4(col, alpha * 0.95);
  }
`;

// Atmosphere rim glow
const ATM_VERT = /* glsl */ `
  varying vec3 vN;
  void main() {
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATM_FRAG = /* glsl */ `
  varying vec3 vN;
  void main() {
    float intensity = pow(0.68 - dot(vN, vec3(0.0, 0.0, 1.0)), 2.8);
    // Forest teal to signal lime rim
    vec3 rimCol = mix(vec3(0.06, 0.25, 0.22), vec3(0.82, 0.93, 0.57), 0.4);
    gl_FragColor = vec4(rimCol * intensity * 1.8, intensity * 0.8);
  }
`;

// ─── Utility Math ─────────────────────────────────────────────────────────────

function latLonToVec3(lat: number, lon: number, radius = 1.01): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── Camera Keyframes for Each Scene ─────────────────────────────────────────

interface CamFrame {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
}

const CAM_FRAMES: CamFrame[] = [
  // Scene 0: ORBIT (Wide orbital view with Indian subcontinent centered)
  { px: 0.0, py: 0.35, pz: 3.9, tx: 0.0, ty: 0.0, tz: 0.0 },
  // Scene 1: FIRE (Camera dives toward Punjab & Haryana fire points)
  { px: 0.42, py: 0.52, pz: 1.95, tx: 0.16, ty: 0.21, tz: 0.0 },
  // Scene 2: WIND (Oblique angle tracking regional wind transport down to Delhi)
  { px: 0.28, py: 0.25, pz: 1.55, tx: 0.11, ty: 0.12, tz: 0.0 },
  // Scene 3: INVERSION (Side profile of Delhi basin showing horizontal inversion lid)
  { px: 0.14, py: 0.08, pz: 1.28, tx: 0.06, ty: 0.02, tz: 0.0 },
  // Scene 4: NEIGHBORHOOD (Direct focal lock on Delhi-NCR)
  { px: 0.09, py: 0.02, pz: 1.12, tx: 0.045, ty: 0.01, tz: 0.0 },
];

interface Props {
  currentScene: number;
  selectedLat?: number;
  selectedLon?: number;
  selectedName?: string;
  isReducedMotion?: boolean;
}

export const AirtraceCanvas: React.FC<Props> = ({
  currentScene,
  selectedLat = 28.6508,
  selectedLon = 77.3152,
  selectedName = 'Anand Vihar',
  isReducedMotion = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const sceneRef = useRef(currentScene);
  sceneRef.current = currentScene;

  useEffect(() => {
    // Check WebGL support safely
    try {
      const canvas = document.createElement('canvas');
      const gl = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // ─── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 150);
    camera.position.set(0, 0.35, 3.9);
    camera.lookAt(0, 0, 0);

    // ─── Lighting ─────────────────────────────────────────────────────────────
    const hemiLight = new THREE.HemisphereLight(0xF0F0E4, 0x091310, 3.0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xF0F0E4, 2.2);
    keyLight.position.set(6, 4, 10);
    scene.add(keyLight);

    // ─── Textures ─────────────────────────────────────────────────────────────
    const loader = new THREE.TextureLoader();
    const spriteTex = loader.load('/earth/circle.png');
    const colorTex = loader.load('/earth/00_earthmap1k.jpg');
    const elevTex = loader.load('/earth/01_earthbump1k.jpg');
    const specTex = loader.load('/earth/02_earthspec1k.jpg');
    const glowTex = loader.load('/earth/04_rainbow1k.jpg');

    // ─── Starfield Background ─────────────────────────────────────────────────
    const starCount = 3000;
    const starPos: number[] = [];
    const starCols: number[] = [];
    for (let i = 0; i < starCount; i++) {
      const r = 24 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      // Subtle teal-tinted stars
      const c = new THREE.Color().setHSL(0.44 + Math.random() * 0.1, 0.3, 0.5 + Math.random() * 0.4);
      starCols.push(c.r, c.g, c.b);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starCols, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.16,
      map: spriteTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // ─── Globe Group ──────────────────────────────────────────────────────────
    const globeGroup = new THREE.Group();
    // Rotate so India (~77°E, 28°N) is facing the primary camera axis
    globeGroup.rotation.y = Math.PI * 0.58;
    scene.add(globeGroup);

    // Collision sphere for cursor raycasting
    const collider = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    globeGroup.add(collider);

    // Point cloud Earth surface
    const earthGeo = new THREE.IcosahedronGeometry(1, 110);
    const uniforms = {
      uSize: { value: 2.7 },
      uColor: { value: colorTex },
      uAlpha: { value: specTex },
      uElev: { value: elevTex },
      uGlow: { value: glowTex },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    };
    const earthMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
      transparent: true,
    });
    globeGroup.add(new THREE.Points(earthGeo, earthMat));

    // Atmosphere rim mesh
    const atmGeo = new THREE.SphereGeometry(1.11, 48, 48);
    const atmMat = new THREE.ShaderMaterial({
      vertexShader: ATM_VERT,
      fragmentShader: ATM_FRAG,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    globeGroup.add(new THREE.Mesh(atmGeo, atmMat));

    // ─── Scene 0: Sentinel-5P Orbit & Swath ────────────────────────────────────
    const satGroup = new THREE.Group();
    scene.add(satGroup);

    // Satellite body (gold insulation box)
    const satBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.04, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0xD4A843,
        metalness: 0.85,
        roughness: 0.2,
      })
    );
    satGroup.add(satBody);

    // Blue solar panel wings
    [-1, 1].forEach((side) => {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.005, 0.055),
        new THREE.MeshStandardMaterial({
          color: 0x1A425F,
          metalness: 0.7,
          roughness: 0.25,
        })
      );
      panel.position.x = side * 0.095;
      satGroup.add(panel);
    });

    // Translucent scanning swath beam
    const swathCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.58, 1.75, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xD0EE91, // Signal lime
        transparent: true,
        opacity: 0.09,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    swathCone.rotation.x = Math.PI;
    swathCone.position.y = -0.88;
    satGroup.add(swathCone);

    // Ground swath footprint ring
    const swathFootprint = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.55, 48),
      new THREE.MeshBasicMaterial({
        color: 0xD0EE91,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    swathFootprint.rotation.x = -Math.PI / 2;
    scene.add(swathFootprint);

    // ─── Scene 1: VIIRS Fire Detections ───────────────────────────────────────
    const fireGroup = new THREE.Group();
    globeGroup.add(fireGroup);

    // Fire heat sprite
    const fireCanvas = document.createElement('canvas');
    fireCanvas.width = fireCanvas.height = 64;
    const fctx = fireCanvas.getContext('2d')!;
    const fgrad = fctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    fgrad.addColorStop(0, '#FFFFFF');
    fgrad.addColorStop(0.2, '#F49A6B'); // Firelight coral
    fgrad.addColorStop(0.55, '#D25438');
    fgrad.addColorStop(1, 'rgba(210, 84, 56, 0)');
    fctx.fillStyle = fgrad;
    fctx.fillRect(0, 0, 64, 64);
    const fireTex = new THREE.CanvasTexture(fireCanvas);

    const fireCoords: number[] = [];
    const fireColors: number[] = [];
    MOCK_FIRES.forEach((f) => {
      const v = latLonToVec3(f.lat, f.lon, 1.018);
      fireCoords.push(v.x, v.y, v.z);
      const intensity = f.frp / 210;
      fireColors.push(1.0, 0.45 + intensity * 0.35, 0.15);
    });

    const fireGeo = new THREE.BufferGeometry();
    fireGeo.setAttribute('position', new THREE.Float32BufferAttribute(fireCoords, 3));
    fireGeo.setAttribute('color', new THREE.Float32BufferAttribute(fireColors, 3));
    const fireMat = new THREE.PointsMaterial({
      size: 0.052,
      map: fireTex,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const firePoints = new THREE.Points(fireGeo, fireMat);
    firePoints.visible = false;
    fireGroup.add(firePoints);

    // ─── Scene 2: Wind Vectors & Smoke Plume ─────────────────────────────────
    const windGroup = new THREE.Group();
    globeGroup.add(windGroup);

    // Transport trajectory: Punjab (lat 31.0, lon 75.0) -> Delhi NCR (lat 28.65, lon 77.2)
    const pStart = latLonToVec3(31.1, 75.1, 1.025);
    const pMid = latLonToVec3(29.8, 76.2, 1.07); // elevated arc in transit
    const pEnd = latLonToVec3(28.65, 77.25, 1.025);
    const transportCurve = new THREE.QuadraticBezierCurve3(pStart, pMid, pEnd);

    const N_PARTICLES = 650;
    const particlePositions = new Float32Array(N_PARTICLES * 3);
    const particleProgress = new Float32Array(N_PARTICLES);
    for (let i = 0; i < N_PARTICLES; i++) {
      particleProgress[i] = Math.random();
      const pt = transportCurve.getPoint(particleProgress[i]);
      const jitter = 0.015;
      particlePositions[i * 3] = pt.x + (Math.random() - 0.5) * jitter;
      particlePositions[i * 3 + 1] = pt.y + (Math.random() - 0.5) * jitter;
      particlePositions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * jitter;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('progress', new THREE.BufferAttribute(particleProgress, 1));

    // Particle sprite
    const pCanvas = document.createElement('canvas');
    pCanvas.width = pCanvas.height = 64;
    const pctx = pCanvas.getContext('2d')!;
    const pgrad = pctx.createRadialGradient(32, 32, 3, 32, 32, 30);
    pgrad.addColorStop(0, 'rgba(244, 154, 107, 0.85)'); // coral smoke core
    pgrad.addColorStop(0.5, 'rgba(180, 110, 60, 0.35)');
    pgrad.addColorStop(1, 'rgba(100, 50, 20, 0)');
    pctx.fillStyle = pgrad;
    pctx.fillRect(0, 0, 64, 64);
    const particleTex = new THREE.CanvasTexture(pCanvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.022,
      map: particleTex,
      transparent: true,
      opacity: 0.8,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    const plumeParticles = new THREE.Points(particleGeo, particleMat);
    plumeParticles.visible = false;
    windGroup.add(plumeParticles);

    // Directional wind vector streamlines
    const streamlineGroup = new THREE.Group();
    windGroup.add(streamlineGroup);
    streamlineGroup.visible = false;
    const streamlineMat = new THREE.LineBasicMaterial({
      color: 0xD0EE91,
      transparent: true,
      opacity: 0.45,
    });
    for (let i = 0; i < 9; i++) {
      const frac = i / 8;
      const s0 = transportCurve.getPoint(frac);
      const s1 = transportCurve.getPoint(Math.min(1, frac + 0.11));
      const slGeo = new THREE.BufferGeometry().setFromPoints([s0, s1]);
      streamlineGroup.add(new THREE.Line(slGeo, streamlineMat));
    }

    // ─── Scene 3: Thermal Inversion Lid ───────────────────────────────────────
    const inversionGroup = new THREE.Group();
    globeGroup.add(inversionGroup);
    inversionGroup.visible = false;

    const delhiVector = latLonToVec3(28.65, 77.22, 1.0);
    inversionGroup.position.copy(delhiVector);
    inversionGroup.lookAt(delhiVector.clone().multiplyScalar(2));

    // Horizontal inversion lid plane (red-orange translucent ceiling)
    const lidPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.14),
      new THREE.MeshBasicMaterial({
        color: 0xF49A6B,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    lidPlane.position.y = 0.045; // starts high, collapses down
    inversionGroup.add(lidPlane);

    // Trapped volume below the inversion lid
    const trappedSmog = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.016, 0.13),
      new THREE.MeshBasicMaterial({
        color: 0x4A1E15,
        transparent: true,
        opacity: 0.35,
      })
    );
    trappedSmog.position.y = 0.008;
    inversionGroup.add(trappedSmog);

    // ─── Scene 4: Neighborhood Pinpoint Reticle ──────────────────────────────
    const focalGroup = new THREE.Group();
    globeGroup.add(focalGroup);
    focalGroup.visible = false;

    const focusPos = latLonToVec3(selectedLat, selectedLon, 1.015);
    focalGroup.position.copy(focusPos);
    focalGroup.lookAt(focusPos.clone().multiplyScalar(2));

    // Concentric reticle rings
    const reticleRing = new THREE.Mesh(
      new THREE.RingGeometry(0.018, 0.022, 32),
      new THREE.MeshBasicMaterial({
        color: 0xD0EE91,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      })
    );
    focalGroup.add(reticleRing);

    const reticlePulse = new THREE.Mesh(
      new THREE.RingGeometry(0.025, 0.029, 32),
      new THREE.MeshBasicMaterial({
        color: 0xD0EE91,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      })
    );
    focalGroup.add(reticlePulse);

    // ─── Mouse Raycasting ─────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // ─── Animation Loop ───────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let animId = 0;
    const currentCamPos = camera.position.clone();
    const currentLook = new THREE.Vector3(0, 0, 0);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const sc = sceneRef.current;

      // Globe continuous rotation (calm, slowed at high zoom)
      if (!isReducedMotion) {
        const rotSpeed = Math.max(0.0002, 0.0016 - sc * 0.0003);
        globeGroup.rotation.y += rotSpeed;
      }

      // Scene 0: Satellite orbit
      const satVisibility = Math.max(0, 1 - sc * 1.2);
      satGroup.visible = satVisibility > 0.01;
      swathFootprint.visible = satVisibility > 0.01;
      if (satGroup.visible) {
        const orbitAngle = t * 0.35;
        satGroup.position.set(
          Math.cos(orbitAngle) * 1.68,
          0.32 + Math.sin(orbitAngle * 0.5) * 0.3,
          Math.sin(orbitAngle) * 1.68
        );
        satGroup.lookAt(0, 0, 0);

        // Ground footprint tracks directly below satellite
        swathFootprint.position.copy(
          satGroup.position.clone().normalize().multiplyScalar(1.018)
        );
        swathFootprint.lookAt(swathFootprint.position.clone().multiplyScalar(2));

        // Swath beam pulsing
        swathCone.material.opacity = (0.07 + Math.sin(t * 3.5) * 0.03) * satVisibility;
        swathFootprint.material.opacity = (0.12 + Math.sin(t * 3.5 + 1) * 0.06) * satVisibility;
      }

      // Scene 1: Fire points
      const fireVis = Math.max(0, Math.min(1, (sc - 0.4) * 1.6));
      firePoints.visible = fireVis > 0.01;
      if (firePoints.visible) {
        fireMat.size = 0.045 + Math.sin(t * 3.2) * 0.014;
        fireMat.opacity = fireVis;
      }

      // Scene 2: Plume particles & wind vectors
      const plumeVis = Math.max(0, Math.min(1, (sc - 1.4) * 1.4));
      plumeParticles.visible = plumeVis > 0.01;
      streamlineGroup.visible = plumeVis > 0.01;
      if (plumeParticles.visible) {
        const posAttr = plumeParticles.geometry.attributes.position as THREE.BufferAttribute;
        const progAttr = plumeParticles.geometry.attributes.progress as THREE.BufferAttribute;
        for (let i = 0; i < N_PARTICLES; i++) {
          let p = progAttr.getX(i) + 0.0028;
          if (p > 1.0) p -= 1.0;
          progAttr.setX(i, p);

          const pt = transportCurve.getPoint(p);
          const wiggle = 0.01;
          posAttr.setXYZ(
            i,
            pt.x + Math.sin(t * 2.2 + i * 0.3) * wiggle * p,
            pt.y + Math.cos(t * 2.8 + i * 0.4) * wiggle * p,
            pt.z + Math.sin(t * 1.9 + i * 0.5) * wiggle * p
          );
        }
        posAttr.needsUpdate = true;
        particleMat.opacity = plumeVis * 0.78;
        streamlineMat.opacity = plumeVis * 0.45;
      }

      // Scene 3: Inversion lid collapse
      const lidVis = Math.max(0, Math.min(1, (sc - 2.4) * 1.5));
      inversionGroup.visible = lidVis > 0.01;
      if (inversionGroup.visible) {
        // Lid drops from 0.045 down to 0.012 as scene progresses
        const targetLidY = 0.045 - lidVis * 0.032;
        lidPlane.position.y += (targetLidY - lidPlane.position.y) * 0.05;
        (lidPlane.material as THREE.MeshBasicMaterial).opacity = lidVis * (0.42 + Math.sin(t * 2.5) * 0.08);
        (trappedSmog.material as THREE.MeshBasicMaterial).opacity = lidVis * 0.35;
      }

      // Scene 4: Neighborhood focal ring
      const focalVis = Math.max(0, Math.min(1, (sc - 3.4) * 2.0));
      focalGroup.visible = focalVis > 0.01;
      if (focalGroup.visible) {
        reticlePulse.scale.setScalar(1 + Math.sin(t * 3.5) * 0.2);
        (reticleRing.material as THREE.MeshBasicMaterial).opacity = focalVis * 0.85;
      }

      // Raycasting interaction for Earth point displacement
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(collider, false);
      if (hits.length > 0 && hits[0].uv) {
        uniforms.uMouse.value.copy(hits[0].uv);
      }

      // Smooth camera interpolation toward active keyframe
      const targetFrame = CAM_FRAMES[Math.min(sc, CAM_FRAMES.length - 1)];
      const lerpSpeed = isReducedMotion ? 0.15 : 0.055;
      currentCamPos.lerp(new THREE.Vector3(targetFrame.px, targetFrame.py, targetFrame.pz), lerpSpeed);
      currentLook.lerp(new THREE.Vector3(targetFrame.tx, targetFrame.ty, targetFrame.tz), lerpSpeed);

      camera.position.copy(currentCamPos);
      camera.lookAt(currentLook);

      renderer.render(scene, camera);
    };

    animate();

    // ─── Window Resize Handler ────────────────────────────────────────────────
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ─── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      atmGeo.dispose();
      atmMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      fireGeo.dispose();
      fireMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isReducedMotion]);

  if (!webglSupported) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#091310] text-[#F0F0E4] p-8 text-center">
        <div className="max-w-md p-6 border border-[#D0EE91]/20 bg-[#102622]/60 rounded-xl backdrop-blur-md">
          <span className="font-telemetry text-xs text-[#D0EE91] tracking-widest block mb-2">
            [ACCELERATED RENDERING FALLBACK]
          </span>
          <h3 className="font-editorial text-2xl mb-3 text-[#F0F0E4]">
            Hardware Acceleration Inactive
          </h3>
          <p className="text-sm text-[#F0F0E4]/70 leading-relaxed mb-4">
            WebGL is not active in this browser session. The full atmospheric forecast data pipeline and neighborhood search below remain completely interactive.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-auto overflow-hidden"
      aria-label="3D Atmospheric visualization of satellite swath, fires, wind advection, and Delhi basin inversion"
    />
  );
};
