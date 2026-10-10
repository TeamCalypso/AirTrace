import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

// ─── Shaders ──────────────────────────────────────────────────────────────────
// Exact vertex-earth approach: each icosahedron vertex becomes a textured point
const VERT = /* glsl */`
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
    mv.z += 0.35 * elv;

    float d = distance(uMouse, vUv);
    float thresh = 0.05;
    vDist = d;
    if (d < thresh) mv.z += (thresh - d) * 12.0;

    gl_PointSize = uSize;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uColor;
  uniform sampler2D uAlpha;
  uniform sampler2D uGlow;
  uniform float uFirePulse;
  varying vec2 vUv;
  varying float vVisible;
  varying float vDist;

  void main() {
    if (floor(vVisible + 0.1) == 0.0) discard;

    float alpha = 1.0 - texture2D(uAlpha, vUv).r;
    vec3 col   = texture2D(uColor, vUv).rgb;
    vec3 glow  = texture2D(uGlow, vUv).rgb;

    // Mouse rainbow interaction
    float thresh = 0.05;
    if (vDist < thresh) col = mix(col, glow, (thresh - vDist) * 40.0);

    // Subtle Indo-Gangetic Plain highlight (India region: U ≈ 0.71, V ≈ 0.56)
    float indU = smoothstep(0.67,0.75,vUv.x) - smoothstep(0.75,0.83,vUv.x);
    float indV = smoothstep(0.38,0.48,vUv.y) - smoothstep(0.48,0.60,vUv.y);
    float mask = indU * indV;
    col = mix(col, vec3(0.15,0.9,1.0), mask * 0.22);

    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Atmosphere shader ────────────────────────────────────────────────────────
const ATM_VERT = /* glsl */`
  varying vec3 vN;
  void main() {
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const ATM_FRAG = /* glsl */`
  varying vec3 vN;
  void main() {
    float i = pow(0.65 - dot(vN, vec3(0,0,1)), 3.0);
    gl_FragColor = vec4(0.06, 0.55, 1.0, 1.0) * i * 1.6;
  }
`;

// ─── Starfield ────────────────────────────────────────────────────────────────
function makeStarfield(n: number, sprite: THREE.Texture) {
  const pos: number[] = [], col: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random() * 30 + 28;
    const u = Math.random(), v = Math.random();
    const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
    pos.push(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph));
    const c = new THREE.Color().setHSL(0.55 + Math.random()*0.15, 0.25, 0.5 + Math.random()*0.5);
    col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size:0.18, vertexColors:true, map:sprite, transparent:true, depthWrite:false }));
}

// ─── Fire glowing points ──────────────────────────────────────────────────────
const FIRES_GEO: Array<{ lat: number; lon: number; frp: number }> = [
  { lat:31.63, lon:74.87, frp:142 }, { lat:31.45, lon:74.92, frp:188 },
  { lat:30.90, lon:75.85, frp:95  }, { lat:30.24, lon:75.84, frp:211 },
  { lat:30.15, lon:74.95, frp:165 }, { lat:30.91, lon:74.62, frp:130 },
  { lat:29.80, lon:76.40, frp:89  }, { lat:29.68, lon:76.98, frp:105 },
  { lat:29.53, lon:75.03, frp:74  }, { lat:30.38, lon:76.38, frp:154 },
  { lat:30.56, lon:75.92, frp:177 }, { lat:31.12, lon:75.34, frp:123 },
  { lat:31.32, lon:75.58, frp:98  }, { lat:29.52, lon:75.45, frp:119 },
  { lat:30.04, lon:76.87, frp:82  },
];

function latLonToVec3(lat: number, lon: number, r = 1.01): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── Camera keyframes for each scene ─────────────────────────────────────────
interface CamKey { px:number; py:number; pz:number; tx:number; ty:number; tz:number }
const CAM: CamKey[] = [
  // 0 – Orbit view (full globe)
  { px:0, py:0.4, pz:4.2,   tx:0, ty:0,   tz:0 },
  // 1 – Dive to Punjab/Haryana fires
  { px:0.45, py:0.55, pz:2.1, tx:0.15, ty:0.2, tz:0 },
  // 2 – Atmospheric transport / wind vectors toward Delhi
  { px:0.25, py:0.2,  pz:1.6, tx:0.1,  ty:0.1, tz:0 },
  // 3 – Inversion lid over Delhi (very close)
  { px:0.12, py:0.05, pz:1.25, tx:0.05, ty:0,  tz:0 },
  // 4 – Ground/forecast (extreme zoom)
  { px:0.08, py:0.0,  pz:1.05, tx:0.04, ty:0,  tz:0 },
];

export interface EarthGlobeHandle {
  toScene: (index: number) => void;
}

interface Props { scene: number; onReady?: () => void }

export const EarthGlobe = React.forwardRef<EarthGlobeHandle, Props>(
  ({ scene, onReady }, _ref) => {
    const mountRef  = useRef<HTMLDivElement>(null);
    const sceneRef  = useRef(scene);
    sceneRef.current = scene;

    useEffect(() => {
      const el = mountRef.current!;
      const W = el.clientWidth, H = el.clientHeight;

      // ── Renderer ────────────────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping    = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      el.appendChild(renderer.domElement);

      const threeScene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, W/H, 0.01, 200);
      camera.position.set(0, 0.4, 4.2);
      camera.lookAt(0, 0, 0);

      // ── Light ────────────────────────────────────────────────────────────────
      threeScene.add(new THREE.HemisphereLight(0xffffff, 0x080820, 3.5));
      const sun = new THREE.DirectionalLight(0xfff5e0, 2.5);
      sun.position.set(8, 5, 12);
      threeScene.add(sun);

      // ── Textures ─────────────────────────────────────────────────────────────
      const tl = new THREE.TextureLoader();
      const sprite   = tl.load('/earth/circle.png');
      const colorTex = tl.load('/earth/00_earthmap1k.jpg');
      const elevTex  = tl.load('/earth/01_earthbump1k.jpg');
      const alphaTex = tl.load('/earth/02_earthspec1k.jpg');
      const glowTex  = tl.load('/earth/04_rainbow1k.jpg');

      // ── Starfield ────────────────────────────────────────────────────────────
      threeScene.add(makeStarfield(5000, sprite));

      // ── Globe group ──────────────────────────────────────────────────────────
      const globeG = new THREE.Group();
      // Rotate so India (~78°E) faces +Z (camera direction)
      // India UV.x ≈ (180+78)/360 = 0.717  → yaw = -(0.717-0.5)*2π ≈ -1.36 rad
      // But screen shows Americas → they're at U≈0.25 facing front by default
      // Rotate by +π to flip, then fine-tune
      globeG.rotation.y = Math.PI * 0.58; // empirically centers India
      threeScene.add(globeG);

      // Invisible raycaster mesh (NO wireframe – that was causing the grid)
      const collider = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 32),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      globeG.add(collider);

      // ── Point-cloud Earth ────────────────────────────────────────────────────
      const detail = 128; // High detail
      const geo = new THREE.IcosahedronGeometry(1, detail);
      const uniforms = {
        uSize:      { value: 2.8 },
        uColor:     { value: colorTex },
        uAlpha:     { value: alphaTex },
        uElev:      { value: elevTex },
        uGlow:      { value: glowTex },
        uMouse:     { value: new THREE.Vector2(0.5, 0.5) },
        uFirePulse: { value: 0 },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms, vertexShader:VERT, fragmentShader:FRAG, transparent:true,
      });
      globeG.add(new THREE.Points(geo, mat));

      // ── Atmosphere ───────────────────────────────────────────────────────────
      const atmGeo = new THREE.SphereGeometry(1.13, 48, 48);
      const atmMat = new THREE.ShaderMaterial({
        vertexShader:ATM_VERT, fragmentShader:ATM_FRAG,
        blending:THREE.AdditiveBlending, side:THREE.BackSide, transparent:true,
      });
      globeG.add(new THREE.Mesh(atmGeo, atmMat));

      // ── Sentinel-5P Swath (scene 0) ──────────────────────────────────────────
      const swathGroup = new THREE.Group();
      threeScene.add(swathGroup);

      // Satellite body
      const satGroup = new THREE.Group();
      const satBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.04),
        new THREE.MeshStandardMaterial({ color:0xd4a843, metalness:0.9, roughness:0.1 })
      );
      satGroup.add(satBody);
      [-1,1].forEach(side => {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.005, 0.055),
          new THREE.MeshStandardMaterial({ color:0x1a3a6e, metalness:0.7, roughness:0.3 })
        );
        panel.position.x = side * 0.09;
        satGroup.add(panel);
      });
      swathGroup.add(satGroup);

      // Swath cone / beam
      const swathCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 1.8, 32, 1, true),
        new THREE.MeshBasicMaterial({
          color:0x00d4ff, transparent:true, opacity:0.08,
          side:THREE.DoubleSide, blending:THREE.AdditiveBlending,
        })
      );
      swathCone.rotation.x = Math.PI;
      swathCone.position.y = -0.9;
      satGroup.add(swathCone);

      // Swath ground footprint (ring on globe)
      const swathRing = new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.58, 64),
        new THREE.MeshBasicMaterial({
          color:0x00d4ff, transparent:true, opacity:0.15,
          side:THREE.DoubleSide, blending:THREE.AdditiveBlending,
        })
      );
      swathRing.rotation.x = -Math.PI / 2;
      swathGroup.add(swathRing);

      // Orbit track
      const trackPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 120; i++) {
        const a = (i/120)*Math.PI*2;
        trackPts.push(new THREE.Vector3(
          Math.cos(a)*1.65,
          Math.sin(a*0.4)*0.6,
          Math.sin(a)*1.65
        ));
      }
      const trackGeo = new THREE.BufferGeometry().setFromPoints(trackPts);
      const trackMat = new THREE.LineBasicMaterial({ color:0x00d4ff, transparent:true, opacity:0.18 });
      threeScene.add(new THREE.Line(trackGeo, trackMat));

      // ── Fire Points (scene 1) ────────────────────────────────────────────────
      const fireGroup = new THREE.Group();
      globeG.add(fireGroup);

      // Glow sprite canvas
      const fc = document.createElement('canvas'); fc.width=fc.height=64;
      const fx = fc.getContext('2d')!;
      const fg = fx.createRadialGradient(32,32,2,32,32,30);
      fg.addColorStop(0,'#ffffff');
      fg.addColorStop(0.15,'#ffdd44');
      fg.addColorStop(0.5,'#ff4400');
      fg.addColorStop(1,'rgba(255,80,0,0)');
      fx.fillStyle=fg; fx.fillRect(0,0,64,64);
      const fireTex = new THREE.CanvasTexture(fc);

      const firePositions: number[] = [];
      const fireColors: number[] = [];
      FIRES_GEO.forEach(f => {
        const v = latLonToVec3(f.lat, f.lon, 1.015);
        firePositions.push(v.x, v.y, v.z);
        const intensity = f.frp / 220;
        fireColors.push(1, 0.3+intensity*0.5, 0.05);
      });
      const fireGeo = new THREE.BufferGeometry();
      fireGeo.setAttribute('position', new THREE.Float32BufferAttribute(firePositions, 3));
      fireGeo.setAttribute('color',    new THREE.Float32BufferAttribute(fireColors, 3));
      const fireMat = new THREE.PointsMaterial({
        size:0.055, map:fireTex, transparent:true,
        vertexColors:true, blending:THREE.AdditiveBlending, depthWrite:false,
      });
      const firePts = new THREE.Points(fireGeo, fireMat);
      firePts.visible = false;
      fireGroup.add(firePts);

      // ── Smoke Plume Particles (scene 2) ──────────────────────────────────────
      const plumeGroup = new THREE.Group();
      globeG.add(plumeGroup);

      // Bezier: Punjab (lat31,lon75) → Delhi (lat28.6,lon77.2)
      const p0 = latLonToVec3(31.0, 75.0, 1.025);
      const p1 = latLonToVec3(30.0, 76.0, 1.08);  // arc up
      const p2 = latLonToVec3(28.6, 77.2, 1.025);
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);

      const NPLUME = 500;
      const plumePos  = new Float32Array(NPLUME*3);
      const plumeProg = new Float32Array(NPLUME);
      for (let i = 0; i < NPLUME; i++) {
        plumeProg[i] = Math.random();
        const pt = curve.getPoint(plumeProg[i]);
        const jitter = 0.012;
        plumePos[i*3]   = pt.x + (Math.random()-.5)*jitter;
        plumePos[i*3+1] = pt.y + (Math.random()-.5)*jitter;
        plumePos[i*3+2] = pt.z + (Math.random()-.5)*jitter;
      }
      const plumeGeo = new THREE.BufferGeometry();
      plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePos, 3));
      plumeGeo.setAttribute('progress',  new THREE.BufferAttribute(plumeProg, 1));

      // Smoke sprite
      const sc = document.createElement('canvas'); sc.width=sc.height=64;
      const sx = sc.getContext('2d')!;
      const sg = sx.createRadialGradient(32,32,3,32,32,30);
      sg.addColorStop(0,'rgba(210,160,80,0.8)');
      sg.addColorStop(0.5,'rgba(150,100,50,0.35)');
      sg.addColorStop(1,'rgba(100,60,30,0)');
      sx.fillStyle=sg; sx.fillRect(0,0,64,64);
      const smokeTex = new THREE.CanvasTexture(sc);

      const plumeMat = new THREE.PointsMaterial({
        size:0.02, map:smokeTex, transparent:true, opacity:0.75,
        blending:THREE.NormalBlending, depthWrite:false,
      });
      const plumePts = new THREE.Points(plumeGeo, plumeMat);
      plumePts.visible = false;
      plumeGroup.add(plumePts);

      // Wind arrow lines
      const arrowGroup = new THREE.Group();
      globeG.add(arrowGroup);
      arrowGroup.visible = false;
      const arrowMat = new THREE.LineBasicMaterial({ color:0xffaa22, transparent:true, opacity:0.55, linewidth:1 });
      for (let i = 0; i < 8; i++) {
        const frac = i / 7;
        const start = curve.getPoint(frac);
        const end   = curve.getPoint(Math.min(1, frac + 0.12));
        const lg = new THREE.BufferGeometry().setFromPoints([start, end]);
        arrowGroup.add(new THREE.Line(lg, arrowMat));
      }

      // ── Inversion Lid (scene 3) ───────────────────────────────────────────────
      const lidGroup = new THREE.Group();
      globeG.add(lidGroup);
      lidGroup.visible = false;

      // Delhi position
      const delhiV = latLonToVec3(28.6, 77.2, 1.0);
      lidGroup.position.copy(delhiV);
      lidGroup.lookAt(delhiV.clone().multiplyScalar(2));

      const lidPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.12),
        new THREE.MeshBasicMaterial({
          color:0xcc2244, transparent:true, opacity:0.5,
          side:THREE.DoubleSide, blending:THREE.AdditiveBlending,
        })
      );
      // Start high, will animate down
      lidPlane.position.y = 0.04;
      lidGroup.add(lidPlane);

      // Lid glow ring
      const lidRing = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.07, 48),
        new THREE.MeshBasicMaterial({ color:0xff3366, transparent:true, opacity:0.4, side:THREE.DoubleSide, blending:THREE.AdditiveBlending })
      );
      lidGroup.add(lidRing);

      // Trapped smog volume
      const smogMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.015, 0.11),
        new THREE.MeshBasicMaterial({ color:0x662211, transparent:true, opacity:0.3 })
      );
      smogMesh.position.y = 0.0;
      lidGroup.add(smogMesh);

      // ── Raycaster for mouse ───────────────────────────────────────────────────
      const raycaster = new THREE.Raycaster();
      const mouseScreen = new THREE.Vector2();

      // ── Camera lerp state ─────────────────────────────────────────────────────
      const camPos    = camera.position.clone();
      const camTarget = new THREE.Vector3(0, 0, 0);
      const currentLook = new THREE.Vector3(0, 0, 0);

      // ── Animation clock ───────────────────────────────────────────────────────
      const clock = new THREE.Clock();
      let raf = 0;

      const animate = () => {
        raf = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const sc = sceneRef.current;

        // Globe auto-rotation (slows down as we zoom in)
        const rotSpeed = Math.max(0, 0.0018 - sc * 0.0003);
        globeG.rotation.y += rotSpeed;

        // Satellite orbit (scene 0 only, fades at 1)
        const satVis = Math.max(0, 1 - sc);
        swathGroup.visible = satVis > 0.01;
        if (swathGroup.visible) {
          const angle = t * 0.4;
          satGroup.position.set(
            Math.cos(angle)*1.65,
            0.3 + Math.sin(angle*0.6)*0.35,
            Math.sin(angle)*1.65
          );
          satGroup.lookAt(0, 0, 0);
          // Swath ground footprint tracks below satellite
          swathRing.position.copy(
            new THREE.Vector3(satGroup.position.x, satGroup.position.y, satGroup.position.z)
              .normalize().multiplyScalar(1.02)
          );
          swathRing.lookAt(swathRing.position.clone().multiplyScalar(2));
          // Pulse opacity
          (swathCone.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(t*3)*0.04;
          (swathRing.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(t*3+1)*0.08;
          swathGroup.children.forEach(c => {
            if ((c as any).material) (c as any).material.opacity *= satVis;
          });
        }

        // Fire points (scene 1+)
        const fireVis = Math.max(0, Math.min(1, sc - 0.5));
        firePts.visible = fireVis > 0.01;
        if (firePts.visible) {
          fireMat.size = 0.04 + Math.sin(t*3)*0.015;
          fireMat.opacity = fireVis;
        }

        // Plume particles flowing (scene 2+)
        const plumeVis = Math.max(0, Math.min(1, sc - 1.5));
        plumePts.visible = plumeVis > 0.01;
        arrowGroup.visible = plumeVis > 0.01;
        if (plumePts.visible) {
          const posAttr  = plumePts.geometry.attributes.position as THREE.BufferAttribute;
          const progAttr = plumePts.geometry.attributes.progress as THREE.BufferAttribute;
          for (let i = 0; i < NPLUME; i++) {
            let p = progAttr.getX(i) + 0.0025;
            if (p > 1) p -= 1;
            progAttr.setX(i, p);
            const pt = curve.getPoint(p);
            const wiggle = 0.008;
            posAttr.setXYZ(i,
              pt.x + Math.sin(t*2+i*0.3)*wiggle*p,
              pt.y + Math.cos(t*2.5+i*0.4)*wiggle*p,
              pt.z + Math.sin(t*1.8+i*0.5)*wiggle*p,
            );
          }
          posAttr.needsUpdate = true;
          plumeMat.opacity = plumeVis * 0.75;
          (arrowMat as THREE.LineBasicMaterial).opacity = plumeVis * 0.55;
        }

        // Inversion lid (scene 3+)
        const lidVis = Math.max(0, Math.min(1, sc - 2.5));
        lidGroup.visible = lidVis > 0.01;
        if (lidGroup.visible) {
          // Animate lid dropping from high to low
          const targetY = 0.04 - lidVis * 0.036; // drops as scene progresses
          lidPlane.position.y += (targetY - lidPlane.position.y)*0.04;
          lidPlane.scale.setScalar(1 + Math.sin(t*2)*0.05);
          (lidPlane.material as THREE.MeshBasicMaterial).opacity = lidVis * 0.5;
          (lidRing.material as THREE.MeshBasicMaterial).opacity  = lidVis * (0.35 + Math.sin(t*2.5)*0.15);
          (smogMesh.material as THREE.MeshBasicMaterial).opacity = lidVis * 0.3;
        }

        // Mouse interaction for globe UV
        raycaster.setFromCamera(mouseScreen, camera);
        const hits = raycaster.intersectObject(collider, false);
        if (hits.length > 0 && hits[0].uv) {
          uniforms.uMouse.value.copy(hits[0].uv);
        }

        // Smooth camera lerp toward target keyframe
        const k = CAM[sc] ?? CAM[4];
        camPos.lerp(new THREE.Vector3(k.px, k.py, k.pz), 0.06);
        camTarget.lerp(new THREE.Vector3(k.tx, k.ty, k.tz), 0.06);
        camera.position.copy(camPos);
        currentLook.lerp(camTarget, 0.06);
        camera.lookAt(currentLook);

        renderer.render(threeScene, camera);
      };
      animate();
      onReady?.();

      // Resize
      const onResize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        camera.aspect = w/h; camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      // Mouse
      const onMouse = (e: MouseEvent) => {
        mouseScreen.set((e.clientX/window.innerWidth)*2-1, -(e.clientY/window.innerHeight)*2+1);
      };
      window.addEventListener('mousemove', onMouse, { passive:true });

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousemove', onMouse);
        renderer.dispose();
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      };
    }, []);

    return (
      <div
        ref={mountRef}
        style={{ position:'absolute', inset:0, overflow:'hidden' }}
      />
    );
  }
);

EarthGlobe.displayName = 'EarthGlobe';
