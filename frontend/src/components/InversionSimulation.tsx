"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { LayersIcon, WindIcon } from "./Icons";
import { CornerTicks } from "./ChapterSection";

// ─── Scenario Presets ─────────────────────────────────────────────────────────
interface InversionPreset {
  id: string;
  name: string;
  timeLabel: string;
  hour: number;
  mixingHeight: number; // meters AGL (120 to 1500)
  coolingRate: number; // °C/hr (0 to 5)
  windSpeed: number; // km/h (0 to 25)
  stagnation: number; // 0 to 1
  surfaceTemp: number; // °C
  aloftTemp: number; // °C
  baseEmissions: number; // µg/m³
  description: string;
}

const PRESETS: InversionPreset[] = [
  {
    id: "peak-trap",
    name: "04:00 AM · Nocturnal Peak Trap",
    timeLabel: "04:00 IST",
    hour: 4,
    mixingHeight: 140,
    coolingRate: 4.2,
    windSpeed: 1.8,
    stagnation: 0.95,
    surfaceTemp: 9.5,
    aloftTemp: 16.2,
    baseEmissions: 185,
    description: "Maximum nocturnal radiational cooling creates a steep +6.7°C inversion layer. Mixing height collapses to 140 m, multiplying particulate density by 9.1×.",
  },
  {
    id: "dusk-forming",
    name: "19:30 PM · Sunset Radiative Collapse",
    timeLabel: "19:30 IST",
    hour: 19.5,
    mixingHeight: 480,
    coolingRate: 3.1,
    windSpeed: 4.5,
    stagnation: 0.65,
    surfaceTemp: 18.0,
    aloftTemp: 19.8,
    baseEmissions: 140,
    description: "Surface heating ceases. The boundary layer rapidly deflates from 1,200 m down past 500 m as evening traffic emissions pour into shrinking air volume.",
  },
  {
    id: "afternoon-flush",
    name: "14:30 PM · Solar Convective Mixing",
    timeLabel: "14:30 IST",
    hour: 14.5,
    mixingHeight: 1420,
    coolingRate: 0.2,
    windSpeed: 14.2,
    stagnation: 0.15,
    surfaceTemp: 27.5,
    aloftTemp: 17.8,
    baseEmissions: 110,
    description: "Sunlight generates vigorous thermal thermals. The mixing lid lifts to 1,420 m, ventilating pollutants aloft into the free troposphere.",
  },
  {
    id: "morning-burnoff",
    name: "09:30 AM · Solar Inversion Burn-Off",
    timeLabel: "09:30 IST",
    hour: 9.5,
    mixingHeight: 680,
    coolingRate: 0.8,
    windSpeed: 7.0,
    stagnation: 0.45,
    surfaceTemp: 16.0,
    aloftTemp: 17.5,
    baseEmissions: 155,
    description: "Morning solar radiation warms the asphalt, breaking the ground inversion from the bottom up. Vertical convection resumes gradually.",
  },
];

// Helper for AQI category
function getAqiCategory(pm25: number) {
  if (pm25 <= 30) return { label: "Good", color: "#34a853", bg: "rgba(52,168,83,0.15)", text: "#81c995" };
  if (pm25 <= 60) return { label: "Satisfactory", color: "#8bc34a", bg: "rgba(139,195,74,0.15)", text: "#aed581" };
  if (pm25 <= 90) return { label: "Moderate", color: "#fbbc04", bg: "rgba(251,188,4,0.15)", text: "#fdd663" };
  if (pm25 <= 120) return { label: "Poor", color: "#ff6d00", bg: "rgba(255,109,0,0.15)", text: "#ff9e80" };
  if (pm25 <= 250) return { label: "Very Poor", color: "#ea4335", bg: "rgba(234,67,53,0.15)", text: "#f28b82" };
  return { label: "Severe+", color: "#9c27b0", bg: "rgba(156,39,176,0.18)", text: "#ce93d8" };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  sourceType: "fire" | "traffic" | "dust";
  life: number;
  maxLife: number;
}

export default function InversionSimulation() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("peak-trap");
  const [hour, setHour] = useState<number>(4);
  const [mixingHeight, setMixingHeight] = useState<number>(140);
  const [windSpeed, setWindSpeed] = useState<number>(1.8);
  const [coolingRate, setCoolingRate] = useState<number>(4.2);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"chamber" | "skewT">("chamber");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  // Apply preset
  const applyPreset = useCallback((preset: InversionPreset) => {
    setSelectedPresetId(preset.id);
    setHour(preset.hour);
    setMixingHeight(preset.mixingHeight);
    setWindSpeed(preset.windSpeed);
    setCoolingRate(preset.coolingRate);
  }, []);

  // Compute calculated physics values
  const physics = useMemo(() => {
    const afternoonRefHeight = 1350; // Reference uncompressed mixing height in m
    const compressionFactor = Math.max(1, afternoonRefHeight / Math.max(80, mixingHeight));
    
    // Stagnation factor based on wind velocity
    const stagnation = Math.max(0, Math.min(1, 1 - windSpeed / 18));
    
    // Temperature delta across boundary layer
    const tempInversionDelta = Math.max(-8, Math.min(10, (coolingRate * 1.6) - (windSpeed * 0.25)));
    
    // Resulting ground PM2.5 calculation
    // Base emission * compression scaling * stagnation trap
    const baseEmissions = 95;
    const concentration = Math.round(
      baseEmissions * Math.pow(compressionFactor, 0.62) * (1 + stagnation * 0.45)
    );

    const aqiCat = getAqiCategory(concentration);
    const verticalVelocity = Math.max(0.01, (mixingHeight / 1400) * (windSpeed > 3 ? 0.35 : 0.04));

    return {
      compressionFactor: compressionFactor.toFixed(1),
      stagnationPct: Math.round(stagnation * 100),
      tempInversionDelta: tempInversionDelta.toFixed(1),
      groundPM25: concentration,
      aqiCat,
      verticalVelocity: verticalVelocity.toFixed(2),
    };
  }, [mixingHeight, windSpeed, coolingRate]);

  // Sync state when hour slider moves
  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    setSelectedPresetId("custom");
    // Diurnal model curve: low at night (04:00), peaks at afternoon (14:30)
    // Formula mirrors ECMWF boundary layer daily cycle
    const angle = ((newHour - 6.5) / 12) * Math.PI;
    let computedHeight: number;
    if (newHour >= 6.5 && newHour <= 18.5) {
      computedHeight = Math.round(180 + 1240 * Math.pow(Math.sin(angle / 2), 1.5));
    } else {
      // Nighttime decay
      const nightFrac = newHour > 18.5 ? (newHour - 18.5) / 12 : (newHour + 5.5) / 12;
      computedHeight = Math.round(450 * Math.exp(-nightFrac * 1.5) + 120);
    }
    setMixingHeight(Math.max(120, Math.min(1500, computedHeight)));

    // Night has lower wind, higher radiative cooling
    const isNight = newHour < 6 || newHour > 19;
    setCoolingRate(isNight ? +(3.2 + Math.sin(newHour) * 1.1).toFixed(1) : +(0.4 + Math.sin(newHour) * 0.3).toFixed(1));
    setWindSpeed(isNight ? +(1.5 + Math.cos(newHour) * 1.2).toFixed(1) : +(11.5 + Math.sin(newHour) * 4.2).toFixed(1));
  };

  // ─── Particle Chamber Animation ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 540);
    let height = (canvas.height = 360);

    const onResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 360;
    };
    window.addEventListener("resize", onResize);

    // Initialize particles
    const MAX_PARTICLES = 320;
    particlesRef.current = Array.from({ length: MAX_PARTICLES }, () => ({
      x: Math.random() * width,
      y: height - 20 - Math.random() * (height * 0.4),
      vx: (Math.random() - 0.5) * (windSpeed * 0.25 + 0.3),
      vy: -(Math.random() * 0.8 + 0.2),
      size: Math.random() * 2.2 + 1.2,
      sourceType: Math.random() > 0.5 ? "fire" : Math.random() > 0.3 ? "traffic" : "dust",
      life: Math.random() * 100,
      maxLife: 120 + Math.random() * 100,
    }));

    let lastTime = performance.now();

    const render = (time: number) => {
      animFrameRef.current = requestAnimationFrame(render);
      if (!isSimRunning) return;

      const dt = Math.min(40, time - lastTime) / 16.6;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Background atmospheric depth gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#050d0a");
      bgGrad.addColorStop(0.65, "#081612");
      bgGrad.addColorStop(1, "#0d2019");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Height scale mapping: 0m to 1600m mapped to height - 28 down to 32
      const groundY = height - 28;
      const skyY = 32;
      const mToY = (m: number) => groundY - ((m / 1600) * (groundY - skyY));
      const lidY = mToY(mixingHeight);

      // ── Draw Altitude Gridlines & Calipers ──────────────────────────────
      ctx.strokeStyle = "rgba(208,238,145,0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);

      const altMarkers = [200, 400, 600, 900, 1200, 1500];
      altMarkers.forEach((alt) => {
        const y = mToY(alt);
        ctx.beginPath();
        ctx.moveTo(48, y);
        ctx.lineTo(width - 16, y);
        ctx.stroke();

        ctx.fillStyle = "rgba(240,240,228,0.35)";
        ctx.font = "9px 'IBM Plex Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${alt}m`, 42, y + 3);
      });
      ctx.setLineDash([]);

      // ── Draw Trapped Smog Haze Density under the Lid ────────────────────
      const hazeGrad = ctx.createLinearGradient(0, lidY, 0, groundY);
      const compressionRatio = Math.min(1, 1400 / Math.max(140, mixingHeight) / 8);
      const hazeAlpha = 0.22 + compressionRatio * 0.45;
      
      // Color shifts from dusky amber to noxious crimson/violet at extreme trap
      const hazeColor = mixingHeight < 250 ? `rgba(210,64,88,${hazeAlpha})` : `rgba(244,154,107,${hazeAlpha * 0.8})`;
      hazeGrad.addColorStop(0, "rgba(244,154,107,0.04)");
      hazeGrad.addColorStop(0.2, hazeColor);
      hazeGrad.addColorStop(1, "rgba(230,85,55,0.55)");

      ctx.fillStyle = hazeGrad;
      ctx.fillRect(48, lidY, width - 64, groundY - lidY);

      // ── Draw Animated Inversion Ceiling Plane ("THE LID") ──────────────
      // Glowing barrier plane
      ctx.save();
      ctx.strokeStyle = "#f49a6b";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#f49a6b";
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.moveTo(48, lidY);
      ctx.lineTo(width - 16, lidY);
      ctx.stroke();

      // Hatching stripes along the ceiling to show barrier effect
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(244,154,107,0.45)";
      const tShift = (time * 0.04) % 16;
      for (let x = 48 + tShift; x < width - 16; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, lidY - 6);
        ctx.lineTo(x + 8, lidY);
        ctx.stroke();
      }
      ctx.restore();

      // Ceiling Callout Badge
      ctx.fillStyle = "#091310";
      ctx.fillRect(width - 165, lidY - 14, 145, 24);
      ctx.strokeStyle = "#f49a6b";
      ctx.strokeRect(width - 165, lidY - 14, 145, 24);

      ctx.fillStyle = "#f49a6b";
      ctx.font = "bold 9.5px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`LID CEILING: ${mixingHeight}m AGL`, width - 157, lidY + 2);

      // Arrow showing downward clamp
      if (mixingHeight < 400) {
        ctx.fillStyle = "#f49a6b";
        ctx.fillText("↓ INVERSION SEAL", width - 157, lidY - 18);
      }

      // ── Draw Skew-T Sounding Curve (if tab selected) ────────────────────
      if (activeTab === "skewT") {
        ctx.save();
        ctx.strokeStyle = "#d0ee91";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#d0ee91";
        ctx.shadowBlur = 6;
        ctx.beginPath();

        // Sounding curve: ground temp -> inversion bulge -> aloft lapse
        const surfX = 110 - (coolingRate * 8);
        const bulgeX = surfX + (coolingRate * 14);
        const aloftX = 90;

        ctx.moveTo(surfX, groundY);
        ctx.quadraticCurveTo(bulgeX, lidY, aloftX, skyY);
        ctx.stroke();

        ctx.fillStyle = "#d0ee91";
        ctx.font = "9px 'IBM Plex Mono', monospace";
        ctx.fillText("TEMPERATURE PROFILE (T)", 64, skyY + 12);
        ctx.fillText(`Ground: ${(18 - coolingRate * 2).toFixed(1)}°C`, surfX + 4, groundY - 8);
        ctx.fillText(`Inversion: +${physics.tempInversionDelta}°C`, bulgeX + 6, lidY - 4);
        ctx.restore();
      }

      // ── Particle Simulation Update & Draw ───────────────────────────────
      const windPush = (windSpeed / 12) * 0.7;
      const vertMultiplier = Math.max(0.08, mixingHeight / 1400);

      particlesRef.current.forEach((p) => {
        // Particles rise due to thermal buoyancy, but cannot pass lid
        p.x += (p.vx + windPush) * dt;
        p.y += (p.vy * vertMultiplier) * dt;
        p.life += dt;

        // Bounce or accumulate below the lid
        if (p.y <= lidY + 4) {
          p.y = lidY + 4 + Math.random() * 3;
          // Particle trapped! Vertical velocity dies
          p.vy = Math.abs(p.vy) * 0.25;
          p.vx += (Math.random() - 0.5) * 0.4;
        }

        // Respawn when old or offscreen
        if (p.life > p.maxLife || p.x > width || p.x < 48 || p.y > groundY) {
          p.x = 52 + Math.random() * (width - 70);
          p.y = groundY - 2 - Math.random() * 8;
          p.life = 0;
          p.vx = (Math.random() - 0.5) * (0.6 + windPush);
          p.vy = -(Math.random() * 1.2 + 0.4);
        }

        // Particle color based on height & compression
        let col = "rgba(244,154,107,0.75)";
        if (p.sourceType === "fire") col = "rgba(255,109,0,0.85)";
        else if (p.sourceType === "traffic") col = "rgba(210,84,56,0.8)";
        else col = "rgba(208,238,145,0.7)";

        if (mixingHeight < 220) {
          col = "rgba(235,68,90,0.9)"; // Red warning when tightly compressed
        }

        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Draw Delhi Urban Ground Surface & Sources ───────────────────────
      ctx.fillStyle = "#07120e";
      ctx.fillRect(48, groundY, width - 64, 28);
      ctx.strokeStyle = "rgba(208,238,145,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(48, groundY);
      ctx.lineTo(width - 16, groundY);
      ctx.stroke();

      // Stylized ground city silhouette (buildings, vehicle flow, India gate silhouette)
      ctx.fillStyle = "rgba(208,238,145,0.15)";
      const bldgs = [
        [70, 16], [95, 22], [130, 14], [160, 26], [185, 18],
        [220, 30], [255, 15], [300, 24], [340, 18], [390, 28],
        [430, 20], [470, 15], [510, 22]
      ];
      bldgs.forEach(([bx, bh]) => {
        if (bx < width - 30) {
          ctx.fillRect(bx, groundY - bh, 18, bh);
        }
      });

      // Label at bottom left
      ctx.fillStyle = "rgba(240,240,228,0.5)";
      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("DELHI BASIN SURFACE (0 M AGL)", 54, height - 10);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [mixingHeight, windSpeed, coolingRate, isSimRunning, activeTab, physics]);

  return (
    <div className="relative w-full rounded-2xl border border-ivory/15 bg-[#0a1814]/90 p-5 md:p-7 backdrop-blur-md shadow-2xl">
      <CornerTicks />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-lime/30 bg-lime/10 text-lime">
            <LayersIcon className="h-3.5 w-3.5 text-ember" />
          </span>
          <div>
            <h3 className="font-mono text-xs font-semibold tracking-[0.2em] text-ivory">
              SIMULATION · ATMOSPHERIC BOUNDARY LAYER CHAMBER
            </h3>
            <p className="font-mono text-[10px] text-ivory/50">
              Interactive Radiational Inversion & Nocturnal Stagnation Model
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-ivory/10 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("chamber")}
            className={`rounded px-2.5 py-1 font-mono text-[9.5px] transition-all ${
              activeTab === "chamber" ? "bg-lime/20 text-lime font-semibold" : "text-ivory/50 hover:text-ivory"
            }`}
          >
            AEROSOL CHAMBER
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("skewT")}
            className={`rounded px-2.5 py-1 font-mono text-[9.5px] transition-all ${
              activeTab === "skewT" ? "bg-lime/20 text-lime font-semibold" : "text-ivory/50 hover:text-ivory"
            }`}
          >
            SOUNDING (T-PROFILE)
          </button>
        </div>
      </div>

      {/* Preset Selector Chips */}
      <div className="my-4 flex flex-wrap gap-2">
        <span className="self-center font-mono text-[10px] tracking-wider text-ivory/40">
          DIURNAL EPISODES:
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            className={`rounded-full border px-3 py-1 font-mono text-[10px] transition-all ${
              selectedPresetId === p.id
                ? "border-ember bg-ember/15 text-ember font-medium shadow-sm shadow-ember/20"
                : "border-ivory/15 bg-ivory/[0.03] text-ivory/60 hover:border-ivory/30 hover:text-ivory"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Simulation Telemetry & Stats Cards */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Mixing Height */}
        <div className="rounded-xl border border-ivory/10 bg-black/40 p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-ivory/50">
            <span>MIXING HEIGHT</span>
            <span className="text-ember">AGL</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-ivory">{mixingHeight}</span>
            <span className="text-[11px] font-mono text-ivory/40">meters</span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-ember transition-all duration-300"
              style={{ width: `${Math.min(100, (mixingHeight / 1500) * 100)}%` }}
            />
          </div>
        </div>

        {/* Volume Compression Factor */}
        <div className="rounded-xl border border-ivory/10 bg-black/40 p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-ivory/50">
            <span>COMPRESSION</span>
            <span className="text-lime">VOL RATIO</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-lime">{physics.compressionFactor}×</span>
            <span className="text-[11px] font-mono text-ivory/40">surge</span>
          </div>
          <p className="mt-1 text-[9.5px] font-mono text-ivory/45">vs. afternoon baseline</p>
        </div>

        {/* Inversion Delta */}
        <div className="rounded-xl border border-ivory/10 bg-black/40 p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-ivory/50">
            <span>INVERSION ΔT</span>
            <span className="text-ember">STEEPNESS</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-ember">
              {physics.tempInversionDelta.startsWith("-") ? physics.tempInversionDelta : `+${physics.tempInversionDelta}`}°C
            </span>
            <span className="text-[11px] font-mono text-ivory/40">aloft</span>
          </div>
          <p className="mt-1 text-[9.5px] font-mono text-ivory/45">traps upward buoyant plume</p>
        </div>

        {/* Simulated Ground PM2.5 */}
        <div
          className="rounded-xl border p-3 transition-colors"
          style={{ borderColor: `${physics.aqiCat.color}55`, backgroundColor: physics.aqiCat.bg }}
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-ivory/60">
            <span>GROUND PM2.5</span>
            <span style={{ color: physics.aqiCat.color }} className="font-bold">
              {physics.aqiCat.label}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-ivory">{physics.groundPM25}</span>
            <span className="text-[11px] font-mono text-ivory/60">µg/m³</span>
          </div>
          <p className="mt-1 text-[9.5px] font-mono text-ivory/60">ambient NAQI sub-index</p>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="relative mb-5 overflow-hidden rounded-xl border border-ivory/15 bg-[#050e0b]">
        <canvas ref={canvasRef} className="block w-full" style={{ height: "360px" }} />

        {/* Overlay Badges */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[9.5px] text-lime border border-lime/30">
            ● VERTICAL VELOCITY: {physics.verticalVelocity} M/S
          </span>
          <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[9.5px] text-ivory/60 border border-ivory/10">
            STAGNATION: {physics.stagnationPct}%
          </span>
        </div>

        {/* Pause / Resume Button */}
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={() => setIsSimRunning(!isSimRunning)}
            className="rounded bg-black/70 px-2.5 py-1 font-mono text-[9px] text-ivory/70 border border-ivory/20 hover:text-ivory"
          >
            {isSimRunning ? "⏸ PAUSE SIM" : "▶ RESUME SIM"}
          </button>
        </div>
      </div>

      {/* Interactive Sliders & Physics Knobs */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-ivory/10 bg-black/30 p-4 md:grid-cols-3">
        {/* Diurnal Time Slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px]">
            <span className="text-ivory/60">DIURNAL TIME (IST)</span>
            <span className="font-bold text-lime">
              {String(Math.floor(hour)).padStart(2, "0")}:{hour % 1 !== 0 ? "30" : "00"} IST
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={23.5}
            step={0.5}
            value={hour}
            onChange={(e) => handleHourChange(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-ivory/15 accent-lime"
          />
          <div className="mt-1 flex justify-between font-mono text-[8.5px] text-ivory/35">
            <span>00:00 (Midnight)</span>
            <span>12:00 (Noon)</span>
            <span>23:30</span>
          </div>
        </div>

        {/* Manual Mixing Height Slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px]">
            <span className="text-ivory/60">LID HEIGHT (AGL)</span>
            <span className="font-bold text-ember">{mixingHeight} m</span>
          </div>
          <input
            type="range"
            min={120}
            max={1500}
            step={10}
            value={mixingHeight}
            onChange={(e) => {
              setMixingHeight(parseInt(e.target.value));
              setSelectedPresetId("custom");
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-ivory/15 accent-ember"
          />
          <div className="mt-1 flex justify-between font-mono text-[8.5px] text-ivory/35">
            <span>120m (Severe Lid)</span>
            <span>800m</span>
            <span>1,500m (Clean Open)</span>
          </div>
        </div>

        {/* Surface Wind Speed Slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px]">
            <span className="text-ivory/60">SURFACE WIND (VENTILATION)</span>
            <span className="font-bold text-lime">{windSpeed} km/h</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={25}
            step={0.5}
            value={windSpeed}
            onChange={(e) => {
              setWindSpeed(parseFloat(e.target.value));
              setSelectedPresetId("custom");
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-ivory/15 accent-lime"
          />
          <div className="mt-1 flex justify-between font-mono text-[8.5px] text-ivory/35">
            <span>&lt;2 km/h (Calm Trap)</span>
            <span>12 km/h</span>
            <span>25 km/h (Flush)</span>
          </div>
        </div>
      </div>

      {/* Physics Explainer Footer */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-lime/15 bg-lime/[0.03] p-3 text-xs leading-relaxed text-ivory/70">
        <span className="text-lime font-mono text-sm">💡</span>
        <p className="font-mono text-[10px] text-ivory/65 leading-relaxed">
          <strong className="text-lime">PHYSICAL INSIGHT:</strong> Because particulate emissions stay roughly constant
          through the night (diesel freighters, brick kilns, regional advection), compressing the mixing layer from 1,400 m to 140 m
          forces 10× more particle mass into each breath of air. Surface cooling shuts off convective thermals, forming an impermeable
          thermodynamic lid over Delhi NCR until solar insolation warms the ground after 08:30 AM.
        </p>
      </div>
    </div>
  );
}
