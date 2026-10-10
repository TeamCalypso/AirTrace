"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CornerTicks } from "./ChapterSection";
import { PinIcon, WindIcon, LayersIcon } from "./Icons";

// ─── Grid Cell Data Model ──────────────────────────────────────────────────
export interface GridCell {
  id: string;
  name: string;
  zone: string;
  col: number; // 0..4 (grid X)
  row: number; // 0..3 (grid Y)
  lat: number;
  lng: number;
  elevationM: number;
  microType: "Trans-Yamuna Bowl" | "Ridge Buffer" | "Arterial Expressway" | "Industrial/Landfill" | "NW Smoke Gateway" | "Urban Heat Island";
  baseLocalPm: number; // local emission baseline µg/m³
  stubbleExposureCoeff: number; // 0.8 to 1.4 based on NW wind exposure
  greenBufferReduction: number; // µg/m³ mitigated by tree canopy
  trafficWeight: number; // 0 to 1
  description: string;
}

const NCR_GRID_CELLS: GridCell[] = [
  {
    id: "narela-rohini",
    name: "Rohini / Narela",
    zone: "North-West Delhi",
    col: 0,
    row: 0,
    lat: 28.74,
    lng: 77.08,
    elevationM: 218,
    microType: "NW Smoke Gateway",
    baseLocalPm: 110,
    stubbleExposureCoeff: 1.35, // Direct first contact with incoming Punjab/Haryana plume
    greenBufferReduction: 12,
    trafficWeight: 0.65,
    description: "Frontline arrival zone for the 315° northwesterly smoke corridor entering the NCR basin from Sonipat.",
  },
  {
    id: "wazirpur-gt",
    name: "Wazirpur / GT Road",
    zone: "North Delhi",
    col: 1,
    row: 0,
    lat: 28.70,
    lng: 77.16,
    elevationM: 216,
    microType: "Industrial/Landfill",
    baseLocalPm: 145,
    stubbleExposureCoeff: 1.25,
    greenBufferReduction: 8,
    trafficWeight: 0.85,
    description: "Dense industrial metal coating & dye clusters coupled with the relentless GT Karnal highway freight stream.",
  },
  {
    id: "anand-vihar",
    name: "Anand Vihar (ISBT)",
    zone: "Trans-Yamuna East",
    col: 2,
    row: 0,
    lat: 28.65,
    lng: 77.31,
    elevationM: 204,
    microType: "Trans-Yamuna Bowl",
    baseLocalPm: 175,
    stubbleExposureCoeff: 1.28,
    greenBufferReduction: 6,
    trafficWeight: 0.95,
    description: "Topographic low bowl beside interstate bus terminal; receives accumulated drift from industrial Sahibabad upwind.",
  },
  {
    id: "ghazipur",
    name: "Ghazipur / Patparganj",
    zone: "East Delhi Basin",
    col: 3,
    row: 0,
    lat: 28.62,
    lng: 77.33,
    elevationM: 206,
    microType: "Industrial/Landfill",
    baseLocalPm: 165,
    stubbleExposureCoeff: 1.15,
    greenBufferReduction: 5,
    trafficWeight: 0.9,
    description: "Smoldering landfill methane fires, National Highway 24 bottleneck, and manufacturing belt create stubborn baseline.",
  },
  {
    id: "dwarka",
    name: "Dwarka Sector 8",
    zone: "South-West Delhi",
    col: 0,
    row: 1,
    lat: 28.57,
    lng: 77.07,
    elevationM: 224,
    microType: "Arterial Expressway",
    baseLocalPm: 95,
    stubbleExposureCoeff: 0.95,
    greenBufferReduction: 16,
    trafficWeight: 0.6,
    description: "Open wide southwestern grid; airport cross-runway winds provide marginally superior horizontal air circulation.",
  },
  {
    id: "connaught-place",
    name: "Connaught Place / Mandir Marg",
    zone: "Central Urban Core",
    col: 1,
    row: 1,
    lat: 28.63,
    lng: 77.22,
    elevationM: 215,
    microType: "Ridge Buffer",
    baseLocalPm: 105,
    stubbleExposureCoeff: 1.05,
    greenBufferReduction: 22,
    trafficWeight: 0.75,
    description: "Central heritage core shielded on the west by the forested Central Ridge, though subject to rush-hour congestion.",
  },
  {
    id: "okhla",
    name: "Okhla Industrial Phase II",
    zone: "South-East Delhi",
    col: 2,
    row: 1,
    lat: 28.53,
    lng: 77.27,
    elevationM: 210,
    microType: "Industrial/Landfill",
    baseLocalPm: 155,
    stubbleExposureCoeff: 1.02,
    greenBufferReduction: 10,
    trafficWeight: 0.88,
    description: "Intense industrial cluster, diesel generators, and waste-to-energy emissions near the Mathura Road freight route.",
  },
  {
    id: "noida-sec62",
    name: "Noida Sector 62",
    zone: "Gautam Buddha Nagar",
    col: 3,
    row: 1,
    lat: 28.62,
    lng: 77.36,
    elevationM: 208,
    microType: "Arterial Expressway",
    baseLocalPm: 115,
    stubbleExposureCoeff: 1.1,
    greenBufferReduction: 14,
    trafficWeight: 0.72,
    description: "Expansive multi-lane IT corridors, metro construction dust, and open trans-Hindon wind channels.",
  },
  {
    id: "vasant-kunj",
    name: "Vasant Kunj / Ridge",
    zone: "South Delhi Hills",
    col: 0,
    row: 2,
    lat: 28.52,
    lng: 77.15,
    elevationM: 248,
    microType: "Ridge Buffer",
    baseLocalPm: 78,
    stubbleExposureCoeff: 0.88,
    greenBufferReduction: 28,
    trafficWeight: 0.5,
    description: "Elevated rocky terrain nested within the Southern Ridge bio-reserve; lowest baseline PM2.5 in urban Delhi.",
  },
  {
    id: "lajpat-nagar",
    name: "Lajpat Nagar / Ring Road",
    zone: "South Central Delhi",
    col: 1,
    row: 2,
    lat: 28.57,
    lng: 77.24,
    elevationM: 213,
    microType: "Arterial Expressway",
    baseLocalPm: 125,
    stubbleExposureCoeff: 1.0,
    greenBufferReduction: 12,
    trafficWeight: 0.92,
    description: "Major flyover convergence point on Ring Road; vehicular idling emits high nitrogen oxides and black carbon.",
  },
  {
    id: "cyber-city",
    name: "Cyber City Gurugram",
    zone: "Haryana Border",
    col: 2,
    row: 2,
    lat: 28.49,
    lng: 77.09,
    elevationM: 226,
    microType: "Urban Heat Island",
    baseLocalPm: 135,
    stubbleExposureCoeff: 0.92,
    greenBufferReduction: 11,
    trafficWeight: 0.85,
    description: "Glass towers and concrete canyons trap vehicular exhaust beneath a micro-urban heat island dome.",
  },
  {
    id: "greater-noida",
    name: "Greater Noida (Pari Chowk)",
    zone: "Eastern NCR Border",
    col: 3,
    row: 2,
    lat: 28.47,
    lng: 77.50,
    elevationM: 201,
    microType: "Arterial Expressway",
    baseLocalPm: 120,
    stubbleExposureCoeff: 0.85,
    greenBufferReduction: 18,
    trafficWeight: 0.65,
    description: "Broad expressway terminus; dry topsoil and real-estate earthworks elevate PM10 alongside winter aerosol drift.",
  },
];

// Helper for AQI styling
function getAqiBadge(pm: number) {
  if (pm <= 30) return { cat: "Good", color: "#34a853", bg: "rgba(52,168,83,0.15)" };
  if (pm <= 60) return { cat: "Satisfactory", color: "#8bc34a", bg: "rgba(139,195,74,0.15)" };
  if (pm <= 90) return { cat: "Moderate", color: "#fbbc04", bg: "rgba(251,188,4,0.15)" };
  if (pm <= 120) return { cat: "Poor", color: "#ff6d00", bg: "rgba(255,109,0,0.15)" };
  if (pm <= 250) return { cat: "Very Poor", color: "#ea4335", bg: "rgba(234,67,53,0.15)" };
  return { cat: "Severe+", color: "#9c27b0", bg: "rgba(156,39,176,0.18)" };
}

export default function NeighborhoodSimulation() {
  const [selectedCell, setSelectedCell] = useState<GridCell>(NCR_GRID_CELLS[2]); // Default Anand Vihar
  const [stubbleFluxMode, setStubbleFluxMode] = useState<"low" | "typical" | "surge">("typical");
  const [grapStage4Active, setGrapStage4Active] = useState<boolean>(false);
  const [windVector, setWindVector] = useState<"nw" | "w" | "calm" | "e">("nw");
  const [inversionTrapLevel, setInversionTrapLevel] = useState<number>(3); // 1 to 5 (1=none, 5=extreme)

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Stubble flux addition in µg/m³
  const stubbleFluxDelta = useMemo(() => {
    switch (stubbleFluxMode) {
      case "low":
        return 45;
      case "typical":
        return 145;
      case "surge":
        return 235;
    }
  }, [stubbleFluxMode]);

  // Wind direction modifier for each cell
  const getWindMultiplier = useCallback(
    (cell: GridCell) => {
      switch (windVector) {
        case "nw":
          return cell.stubbleExposureCoeff; // NW wind accelerates stubble directly into NW gateway and Trans-Yamuna
        case "w":
          return cell.stubbleExposureCoeff * 0.9;
        case "calm":
          return 0.75; // Stagnation: less advection, but higher local concentration
        case "e":
          return 0.45; // Clean easterlies wash stubble away
      }
    },
    [windVector]
  );

  // Compute PM2.5 for a given cell under current controls
  const calculateCellMetrics = useCallback(
    (cell: GridCell) => {
      const windMul = getWindMultiplier(cell);

      // Stubble component
      const stubbleContribution = Math.round(stubbleFluxDelta * windMul);

      // Local component (reduced if GRAP-IV is active)
      const grapDiscount = grapStage4Active ? 0.38 : 1.0; // 38% reduction in local traffic/dust/industry under GRAP-IV
      const localContribution = Math.round(
        (cell.baseLocalPm - cell.greenBufferReduction) * grapDiscount
      );

      // Inversion trapping multiplier (1.0 to 1.85)
      const inversionMultiplier = 1.0 + (inversionTrapLevel - 1) * 0.18;

      // Net Ground PM2.5
      const totalPm25 = Math.round((stubbleContribution + localContribution) * inversionMultiplier);

      // Source breakdown percentages
      const totalSources = stubbleContribution + localContribution;
      const stubblePct = Math.round((stubbleContribution / totalSources) * 100);
      const localPct = 100 - stubblePct;
      const stagnationShare = Math.round(((inversionMultiplier - 1.0) / inversionMultiplier) * 100);

      // Quantile bands (p10 optimistic, p50 median, p90 severe)
      const p50 = totalPm25;
      const p10 = Math.round(p50 * 0.78);
      const p90 = Math.round(p50 * 1.34);

      return {
        totalPm25,
        p10,
        p50,
        p90,
        stubblePct,
        localPct,
        stagnationShare,
        stubbleContribution,
        localContribution,
        badge: getAqiBadge(totalPm25),
      };
    },
    [stubbleFluxDelta, getWindMultiplier, grapStage4Active, inversionTrapLevel]
  );

  const selectedMetrics = useMemo(() => calculateCellMetrics(selectedCell), [
    calculateCellMetrics,
    selectedCell,
  ]);

  // ─── Canvas Particle Advection Grid Animation ───────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 540);
    let height = (canvas.height = 240);

    const onResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 240;
    };
    window.addEventListener("resize", onResize);

    // Particle field for smoke drift across grid
    interface DriftDot {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
    }
    const DOTS_COUNT = 160;
    const dots: DriftDot[] = Array.from({ length: DOTS_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: windVector === "nw" ? 1.4 : windVector === "w" ? 1.6 : windVector === "calm" ? 0.3 : -1.2,
      vy: windVector === "nw" ? 1.1 : windVector === "w" ? 0.2 : windVector === "calm" ? 0.2 : -0.4,
      size: Math.random() * 2.4 + 1.0,
      alpha: Math.random() * 0.6 + 0.2,
    }));

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      // Deep atmospheric background
      ctx.fillStyle = "#07120e";
      ctx.fillRect(0, 0, width, height);

      // Draw stylized 3 km Grid Cells on Canvas
      const cols = 4;
      const rows = 3;
      const padding = 16;
      const cellW = (width - padding * 2) / cols;
      const cellH = (height - padding * 2) / rows;

      NCR_GRID_CELLS.forEach((cell) => {
        const cx = padding + cell.col * cellW;
        const cy = padding + cell.row * cellH;
        const m = calculateCellMetrics(cell);

        // Heatmap cell background
        ctx.fillStyle = `${m.badge.color}18`;
        ctx.fillRect(cx + 2, cy + 2, cellW - 4, cellH - 4);

        // Border highlight
        const isSelected = selectedCell.id === cell.id;
        ctx.strokeStyle = isSelected ? "#d0ee91" : `${m.badge.color}44`;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(cx + 2, cy + 2, cellW - 4, cellH - 4);

        // Cell name & PM2.5 text
        ctx.fillStyle = isSelected ? "#d0ee91" : "#f0f0e4";
        ctx.font = "bold 9.5px 'IBM Plex Mono', monospace";
        ctx.fillText(cell.name.split("/")[0].trim(), cx + 7, cy + 16);

        ctx.fillStyle = m.badge.color;
        ctx.font = "bold 13px 'IBM Plex Mono', monospace";
        ctx.fillText(`${m.totalPm25}`, cx + 7, cy + 34);

        ctx.fillStyle = "rgba(240,240,228,0.4)";
        ctx.font = "8px 'IBM Plex Mono', monospace";
        ctx.fillText("µg/m³", cx + 46, cy + 34);

        if (isSelected) {
          // Crosshair reticle ticks
          ctx.strokeStyle = "#d0ee91";
          ctx.beginPath();
          ctx.moveTo(cx + 2, cy + 8);
          ctx.lineTo(cx + 8, cy + 2);
          ctx.stroke();
        }
      });

      // Flowing smoke particles along wind vector
      const speedScale = windVector === "calm" ? 0.35 : 1.25;
      dots.forEach((d) => {
        d.x += d.vx * speedScale;
        d.y += d.vy * speedScale;

        if (d.x > width) d.x = 0;
        if (d.x < 0) d.x = width;
        if (d.y > height) d.y = 0;
        if (d.y < 0) d.y = height;

        ctx.fillStyle = `rgba(244,154,107,${d.alpha * (stubbleFluxMode === 'surge' ? 0.8 : 0.5)})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Wind Vector Compass Arrow in corner
      ctx.save();
      ctx.fillStyle = "rgba(208,238,145,0.85)";
      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.fillText(`VECTOR: ${windVector.toUpperCase()} CORRIDOR`, width - 150, 18);
      ctx.restore();
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [selectedCell, calculateCellMetrics, windVector, stubbleFluxMode]);

  return (
    <div className="relative w-full rounded-2xl border border-ivory/15 bg-[#0a1814]/90 p-5 md:p-7 backdrop-blur-md shadow-2xl">
      <CornerTicks />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-lime/30 bg-lime/10 text-lime">
            <PinIcon className="h-3.5 w-3.5 text-ember" />
          </span>
          <div>
            <h3 className="font-mono text-xs font-semibold tracking-[0.2em] text-ivory">
              SIMULATION · 3 KM NEIGHBORHOOD MICRO-DISPERSION SANDBOX
            </h3>
            <p className="font-mono text-[10px] text-ivory/50">
              Hyperlocal Spatial Advection, Terrain Buffers & GRAP-IV Policy Interventions
            </p>
          </div>
        </div>

        {/* GRAP Stage IV Emergency Policy Toggle */}
        <button
          type="button"
          onClick={() => setGrapStage4Active(!grapStage4Active)}
          className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-xs transition-all ${
            grapStage4Active
              ? "border-lime bg-lime/20 text-lime font-bold shadow-md shadow-lime/20"
              : "border-ivory/20 bg-ivory/[0.04] text-ivory/70 hover:border-lime/40"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${grapStage4Active ? "bg-lime animate-ping" : "bg-ivory/40"}`} />
          <span>GRAP STAGE-IV MANDATE: {grapStage4Active ? "ACTIVE (-38%)" : "OFF"}</span>
        </button>
      </div>

      {/* Scenario Control Knobs */}
      <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Stubble Inflow Mode */}
        <div className="rounded-xl border border-ivory/10 bg-black/40 p-3">
          <label className="font-mono text-[10px] text-ivory/50 block mb-2">
            REGIONAL STUBBLE FLUX:
          </label>
          <div className="flex gap-1.5">
            {(["low", "typical", "surge"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStubbleFluxMode(mode)}
                className={`flex-1 rounded py-1 font-mono text-[9.5px] uppercase transition-all ${
                  stubbleFluxMode === mode
                    ? "bg-ember/25 border border-ember text-ember font-bold"
                    : "bg-white/[0.03] text-ivory/50 border border-ivory/10 hover:text-ivory"
                }`}
              >
                {mode === "low" ? "1.2K Fires" : mode === "typical" ? "3.8K (Normal)" : "6.4K Surge"}
              </button>
            ))}
          </div>
        </div>

        {/* Wind Vector Corridor */}
        <div className="rounded-xl border border-ivory/10 bg-black/40 p-3">
          <label className="font-mono text-[10px] text-ivory/50 block mb-2">
            SYNOPTIC WIND VECTOR:
          </label>
          <div className="flex gap-1.5">
            {[
              { id: "nw", label: "315° NW (Corridor)" },
              { id: "w", label: "270° W" },
              { id: "calm", label: "Calm (<2 km/h)" },
              { id: "e", label: "Easterly" },
            ].map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWindVector(w.id as any)}
                className={`flex-1 rounded py-1 font-mono text-[9px] transition-all ${
                  windVector === w.id
                    ? "bg-lime/20 border border-lime text-lime font-bold"
                    : "bg-white/[0.03] text-ivory/50 border border-ivory/10 hover:text-ivory"
                }`}
              >
                {w.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Nocturnal Inversion Severity */}
        <div className="rounded-xl border border-ivory/10 bg-black/40 p-3">
          <div className="flex justify-between items-center mb-1 font-mono text-[10px]">
            <span className="text-ivory/50">INVERSION TRAPPING:</span>
            <span className="text-ember font-bold">LVL {inversionTrapLevel} / 5</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={inversionTrapLevel}
            onChange={(e) => setInversionTrapLevel(parseInt(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-ivory/15 accent-ember mt-2"
          />
          <div className="flex justify-between font-mono text-[8px] text-ivory/35 mt-1">
            <span>Open (Day)</span>
            <span>Severe Lid (Night)</span>
          </div>
        </div>
      </div>

      {/* Main 3 km Grid Heatmap Canvas */}
      <div className="relative mb-5 overflow-hidden rounded-xl border border-ivory/15 bg-[#050e0b]">
        <canvas ref={canvasRef} className="block w-full" style={{ height: "240px" }} />

        {/* Canvas instruction badge */}
        <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-2">
          <span className="rounded bg-black/70 px-2.5 py-1 font-mono text-[9px] text-lime border border-lime/30">
            CLICK ANY 3 KM CELL BELOW TO INSPECT LOCAL TOPOGRAPHY & QUANTILE FORECAST
          </span>
        </div>
      </div>

      {/* 3 km Grid Cell Selector Matrix */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {NCR_GRID_CELLS.map((cell) => {
          const m = calculateCellMetrics(cell);
          const isSelected = selectedCell.id === cell.id;
          return (
            <button
              key={cell.id}
              type="button"
              onClick={() => setSelectedCell(cell)}
              className={`rounded-xl border p-2.5 text-left transition-all ${
                isSelected
                  ? "border-lime bg-lime/10 shadow-md shadow-lime/15 ring-1 ring-lime/40"
                  : "border-ivory/10 bg-black/30 hover:border-ivory/25 hover:bg-black/50"
              }`}
            >
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="truncate text-ivory/60">{cell.zone.split(" ")[0]}</span>
                <span style={{ color: m.badge.color }} className="font-bold">
                  ●
                </span>
              </div>
              <div className="my-1 font-mono text-xs font-semibold text-ivory truncate">{cell.name}</div>
              <div className="flex items-baseline justify-between font-mono text-xs">
                <span className="font-bold" style={{ color: m.badge.color }}>
                  {m.totalPm25}
                </span>
                <span className="text-[8.5px] text-ivory/40">µg/m³</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Neighborhood Deep-Dive Inspection Panel */}
      <div className="rounded-xl border border-ivory/15 bg-black/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
              <span className="font-mono text-xs font-bold text-lime">{selectedCell.name}</span>
              <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[9px] text-ivory/50 border border-ivory/10">
                {selectedCell.microType}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-ivory/60 font-sans">{selectedCell.description}</p>
          </div>

          {/* AQI Badge */}
          <div
            className="flex items-center gap-2 rounded-xl border px-3.5 py-1.5"
            style={{
              borderColor: `${selectedMetrics.badge.color}66`,
              backgroundColor: selectedMetrics.badge.bg,
            }}
          >
            <span className="font-mono text-lg font-bold" style={{ color: selectedMetrics.badge.color }}>
              {selectedMetrics.totalPm25} µg/m³
            </span>
            <span
              className="rounded px-2 py-0.5 font-mono text-[10px] font-bold text-black"
              style={{ backgroundColor: selectedMetrics.badge.color }}
            >
              {selectedMetrics.badge.cat}
            </span>
          </div>
        </div>

        {/* Quantile Bands + Source Breakdown Grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* LightGBM Quantile Bands */}
          <div className="rounded-xl border border-ivory/10 bg-black/30 p-3.5">
            <span className="font-mono text-[10px] text-ivory/50 block mb-2">
              LIGHTGBM 48-H QUANTILE PREDICTION ENVELOPE:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-ivory/10 bg-white/[0.02] p-2 text-center">
                <div className="text-[9px] font-mono text-ivory/40">p10 (OPTIMISTIC)</div>
                <div className="mt-1 font-mono text-base font-bold text-[#81c995]">{selectedMetrics.p10}</div>
                <div className="text-[8.5px] font-mono text-ivory/40">µg/m³</div>
              </div>
              <div className="rounded-lg border border-lime/30 bg-lime/[0.05] p-2 text-center">
                <div className="text-[9px] font-mono text-lime">p50 (MEDIAN)</div>
                <div className="mt-1 font-mono text-base font-bold text-lime">{selectedMetrics.p50}</div>
                <div className="text-[8.5px] font-mono text-ivory/40">µg/m³</div>
              </div>
              <div className="rounded-lg border border-ember/30 bg-ember/[0.05] p-2 text-center">
                <div className="text-[9px] font-mono text-ember">p90 (WORST PEAK)</div>
                <div className="mt-1 font-mono text-base font-bold text-ember">{selectedMetrics.p90}</div>
                <div className="text-[8.5px] font-mono text-ivory/40">µg/m³</div>
              </div>
            </div>
            <p className="mt-2 text-[9px] font-mono text-ivory/40 text-center">
              Uncertainty envelope widens dynamically with transport lead time (18h to 48h).
            </p>
          </div>

          {/* 3-Way Source Attribution Breakdown */}
          <div className="rounded-xl border border-ivory/10 bg-black/30 p-3.5">
            <span className="font-mono text-[10px] text-ivory/50 block mb-2">
              3-WAY EMISSION SOURCE ATTRIBUTION:
            </span>
            <div className="space-y-2 text-xs font-mono">
              <div>
                <div className="flex justify-between text-[10px] text-ivory/70 mb-1">
                  <span>🌾 Agricultural Stubble Inflow</span>
                  <span className="text-ember font-bold">{selectedMetrics.stubblePct}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-ember transition-all duration-300" style={{ width: `${selectedMetrics.stubblePct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-ivory/70 mb-1">
                  <span>🚗 Local Traffic, Dust & Industry</span>
                  <span className="text-lime font-bold">{selectedMetrics.localPct}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-lime transition-all duration-300" style={{ width: `${selectedMetrics.localPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-ivory/70 mb-1">
                  <span>🌫️ Inversion Nocturnal Compression</span>
                  <span className="text-[#ce93d8] font-bold">+{selectedMetrics.stagnationShare}% factor</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ce93d8] transition-all duration-300" style={{ width: `${selectedMetrics.stagnationShare}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Micro-Environment Modifiers */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ivory/10 pt-3 text-[10px] font-mono text-ivory/50">
          <span>ELEVATION: {selectedCell.elevationM} M AGL</span>
          <span>NW EXPOSURE COEFF: {selectedCell.stubbleExposureCoeff}×</span>
          <span>TREE CANOPY BUFFER: -{selectedCell.greenBufferReduction} µg/m³</span>
          <span className="text-lime">
            {grapStage4Active ? "POLICY EFFECT: -38% VIA DIESEL/CONSTRUCTION BAN" : "POLICY EFFECT: NO EMERGENCY MEASURES"}
          </span>
        </div>
      </div>
    </div>
  );
}
