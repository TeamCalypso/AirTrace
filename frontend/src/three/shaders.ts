/**
 * Hand-written GLSL for the cinematic journey. No #include chunks, so the
 * shaders stay portable across three.js releases.
 */

export const globeVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const globeFrag = /* glsl */ `
precision highp float;
uniform sampler2D uLand;
uniform sampler2D uLights;
uniform sampler2D uBorders;
uniform vec3 uSun;
uniform float uBorderGlow;
uniform float uGrid;
uniform float uHaze;
uniform vec2 uHazeCenter;
uniform float uTime;
uniform float uNightMix;
uniform vec3 uOceanDeep;
uniform vec3 uOceanShallow;
uniform vec3 uLandLow;
uniform vec3 uLandHigh;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float land = texture2D(uLand, vUv).r;
  float lights = texture2D(uLights, vUv).r;
  float border = texture2D(uBorders, vUv).r;

  float sun = dot(normalize(vNormalW), normalize(uSun));
  float day = smoothstep(-0.22, 0.34, sun);
  float twilight = exp(-pow((sun + 0.02) * 5.4, 2.0));

  // ocean
  vec3 ocean = mix(uOceanDeep, uOceanShallow, day * 0.75 + 0.25 * smoothstep(0.0, 1.0, land));
  // land: two-tone with grain so continents are never flat
  float grain = hash(floor(vUv * vec2(2048.0, 1024.0))) * 0.16 + hash(floor(vUv * vec2(320.0, 160.0))) * 0.22;
  vec3 landCol = mix(uLandLow, uLandHigh, clamp(grain + day * 0.35, 0.0, 1.0));
  vec3 base = mix(ocean, landCol, smoothstep(0.28, 0.62, land));

  // city lights bloom on the night side
  float nightSide = 1.0 - day;
  vec3 cityGlow = vec3(1.0, 0.76, 0.44) * pow(lights, 1.35) * (nightSide * 1.25 + 0.18) * uNightMix;
  cityGlow += vec3(1.0, 0.86, 0.62) * pow(lights, 4.0) * nightSide * 2.4 * uNightMix;

  // limb / atmosphere scattering
  float fres = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 2.6);
  vec3 rim = mix(vec3(0.22, 0.55, 0.95), vec3(0.55, 0.78, 1.0), day) * fres * (0.5 + 0.7 * day);

  // graticule every 15 degrees
  vec2 g = abs(fract(vUv * vec2(24.0, 12.0)) - 0.5);
  float gridLine = (1.0 - smoothstep(0.0, 0.02, min(g.x, g.y))) * uGrid;
  vec3 grid = vec3(0.45, 0.72, 1.0) * gridLine * 0.24 * (0.35 + day);

  // regional smoke haze — a soft brown-grey bloom over the north-west plain
  float d = distance(vUv, uHazeCenter);
  float hazeMask = exp(-pow(d * 7.4, 1.7)) * uHaze;
  vec3 hazeCol = mix(vec3(0.42, 0.38, 0.34), vec3(0.62, 0.58, 0.55), lights);

  vec3 col = base * (0.16 + 1.05 * day) + cityGlow + rim + grid + hazeCol * hazeMask * 1.35;
  col += vec3(0.9, 0.5, 0.22) * twilight * 0.16;

  // state borders glow when we dive in
  col += vec3(0.42, 0.86, 1.0) * border * uBorderGlow * (0.5 + 0.5 * day);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const atmosphereVert = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const atmosphereFrag = /* glsl */ `
precision highp float;
uniform vec3 uSun;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uPower;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), uPower);
  float sun = smoothstep(-0.5, 0.55, dot(normalize(vNormalW), normalize(uSun)));
  vec3 col = uColor * fres * (0.25 + 1.15 * sun) * uIntensity;
  gl_FragColor = vec4(col, fres * uIntensity);
}
`;

export const swathVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const swathFrag = /* glsl */ `
precision highp float;
uniform float uProgress;
uniform float uOpacity;
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  // uProgress sweeps along uv.x; the leading edge is the brightest
  float head = uProgress;
  float behind = (head - vUv.x) / 0.34;
  float body = smoothstep(0.0, 1.0, behind);
  float trail = exp(-max(0.0, vUv.x - head) * 14.0);
  float edge = sin(vUv.y * 3.14159);
  float scan = 0.55 + 0.45 * sin(vUv.x * 190.0 - uTime * 5.0);
  float a = (body * 0.75 + trail * 0.25) * edge * uOpacity;
  vec3 col = uColor * (0.55 + 0.85 * body) + vec3(1.0) * pow(body, 6.0) * 0.8;
  col *= scan;
  gl_FragColor = vec4(col, a);
}
`;

export const pointVert = /* glsl */ `
attribute float aBirth;
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uReveal;
uniform float uTime;
uniform float uScale;
uniform float uPulse;
uniform float uSizeBoost;
varying vec3 vColor;
varying float vFade;
void main() {
  float shown = smoothstep(aBirth - 0.05, aBirth + 0.02, uReveal);
  vFade = shown;
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float pop = 1.0 + 0.9 * exp(-max(0.0, (uReveal - aBirth)) * 26.0);
  float flicker = 0.82 + 0.18 * sin(uTime * (5.0 + aSeed * 7.0) + aSeed * 30.0);
  gl_PointSize = aSize * uScale * pop * flicker * uSizeBoost * (1.0 / max(0.02, -mv.z));
  gl_Position = projectionMatrix * mv;
}
`;

export const pointFrag = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform float uOpacity;
varying vec3 vColor;
varying float vFade;
void main() {
  vec4 tex = texture2D(uMap, gl_PointCoord);
  float a = tex.a * uOpacity * vFade;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * tex.rgb, a);
}
`;

export const plumeVert = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
uniform float uGlobalAlpha;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aAlpha * uGlobalAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale * (1.0 / max(0.02, -mv.z));
  gl_Position = projectionMatrix * mv;
}
`;

export const plumeFrag = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 tex = texture2D(uMap, gl_PointCoord);
  float a = tex.a * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

export const flowVert = /* glsl */ `
attribute float aT;
attribute float aLen;
uniform float uTime;
uniform float uSpeed;
varying float vT;
varying float vLen;
void main() {
  vT = aT;
  vLen = aLen;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const flowFrag = /* glsl */ `
precision highp float;
uniform float uOpacity;
uniform vec3 uColor;
uniform float uTime;
uniform float uSpeed;
uniform float uDash;
varying float vT;
varying float vLen;
void main() {
  float flow = fract(vT * uDash - uTime * uSpeed);
  float pulse = smoothstep(0.0, 0.45, flow) * smoothstep(1.0, 0.55, flow);
  float a = uOpacity * (0.16 + 0.9 * pulse);
  gl_FragColor = vec4(uColor * (0.5 + 1.5 * pulse), a);
}
`;

export const lidVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const lidFrag = /* glsl */ `
precision highp float;
uniform float uOpacity;
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float disc = smoothstep(1.0, 0.86, r);
  float rings = 0.5 + 0.5 * sin(r * 34.0 - uTime * 1.6);
  float grid = (1.0 - smoothstep(0.0, 0.012, abs(fract(vUv.x * 26.0) - 0.5) - 0.45))
             + (1.0 - smoothstep(0.0, 0.012, abs(fract(vUv.y * 26.0) - 0.5) - 0.45));
  float edge = smoothstep(0.72, 1.0, r) * (1.0 - smoothstep(0.985, 1.0, r));
  float a = (disc * 0.22 + rings * disc * 0.16 + grid * disc * 0.32 + edge * 0.95) * uOpacity;
  vec3 col = uColor * (0.6 + 0.8 * edge) + vec3(0.6, 0.85, 1.0) * grid * 0.35;
  gl_FragColor = vec4(col, a);
}
`;
