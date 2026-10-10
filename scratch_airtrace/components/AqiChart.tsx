"use client";

import { useMemo, useRef, useState } from "react";
import { AQI_CATEGORIES, HOURS, type Forecast } from "@/lib/forecast";

const W = 760;
const H = 300;
const ML = 46;
const MR = 74;
const MT = 30;
const MB = 36;
const PW = W - ML - MR;
const PH = H - MT - MB;

function xAt(i: number) {
  return ML + (i / (HOURS - 1)) * PW;
}

/**
 * Accessible 48-hour AQI trend chart (inline SVG, no chart lib).
 * Category bands, peak + now markers, pointer hover readout,
 * and a collapsible data table for screen readers / keyboard users.
 */
export default function AqiChart({ forecast }: { forecast: Forecast }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const yMax = useMemo(() => {
    const m = Math.max(...forecast.points.map((p) => p.aqi));
    return Math.max(200, Math.ceil(m / 50) * 50);
  }, [forecast]);

  const yAt = (a: number) => MT + (1 - a / yMax) * PH;

  const { linePath, areaPath } = useMemo(() => {
    let d = "";
    forecast.points.forEach((p, i) => {
      d += `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.aqi).toFixed(1)} `;
    });
    const area =
      `${d} L${xAt(HOURS - 1).toFixed(1)},${(MT + PH).toFixed(1)} ` +
      `L${xAt(0).toFixed(1)},${(MT + PH).toFixed(1)} Z`;
    return { linePath: d, areaPath: area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecast, yMax]);

  const peak = forecast.peak;
  const current = forecast.current;

  const onMove = (e: React.PointerEvent) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.min(
      HOURS - 1,
      Math.max(0, Math.round(((px - ML) / PW) * (HOURS - 1))),
    );
    setHover(i);
  };

  const hp = hover != null ? forecast.points[hover] : null;
  const tipX = hover != null ? xAt(hover) : 0;
  const tipLeft = tipX > W - 190;

  const summary = `Illustrative 48-hour AQI outlook for ${forecast.neighborhood.name}. Starts at ${current.aqi} (${current.category.name}), peaks at ${peak.aqi} (${peak.category.name}) around ${peak.label}, ends at ${forecast.points[47].aqi}. Not live data.`;

  const axisMarks: Array<[number, string]> = [
    [0, "NOW"],
    [6, "+6H"],
    [12, "+12H"],
    [18, "+18H"],
    [24, "D+1"],
    [30, "+30H"],
    [36, "+36H"],
    [42, "+42H"],
    [47, "+47H"],
  ];

  return (
    <figure className="m-0">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        className="w-full select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="aqi-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0ee91" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#d0ee91" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* category bands */}
        {AQI_CATEGORIES.map((c, idx) => {
          const lo = idx === 0 ? 0 : AQI_CATEGORIES[idx - 1].max;
          const hi = Math.min(c.max, yMax);
          if (hi <= lo) return null;
          const y1 = yAt(hi);
          const y2 = yAt(Math.max(lo, 0));
          return (
            <g key={c.short}>
              <rect x={ML} y={y1} width={PW} height={y2 - y1} fill={c.color} opacity={0.05} />
              {c.max < yMax && (
                <line x1={ML} x2={ML + PW} y1={yAt(c.max)} y2={yAt(c.max)} stroke={c.color} strokeOpacity={0.3} strokeDasharray="3 6" strokeWidth={1} />
              )}
              {y2 - y1 > 26 && (
                <text x={W - MR + 8} y={(y1 + y2) / 2 + 3} fill={c.color} opacity={0.75} fontSize={9} fontFamily="var(--font-mono), monospace" letterSpacing={1}>
                  {c.short}
                </text>
              )}
            </g>
          );
        })}

        {/* y grid */}
        {Array.from({ length: yMax / 50 }, (_, i) => (i + 1) * 50).map((v) => (
          <g key={v}>
            <line x1={ML} x2={ML + PW} y1={yAt(v)} y2={yAt(v)} stroke="#f0f0e4" strokeOpacity={0.07} strokeWidth={1} />
            <text x={ML - 8} y={yAt(v) + 3} textAnchor="end" fill="#f0f0e4" opacity={0.4} fontSize={9} fontFamily="var(--font-mono), monospace">
              {v}
            </text>
          </g>
        ))}
        <line x1={ML} x2={ML + PW} y1={MT + PH} y2={MT + PH} stroke="#f0f0e4" strokeOpacity={0.15} strokeWidth={1} />

        {/* x axis labels */}
        {axisMarks.map(([i, label]) => (
          <text key={label + i} x={xAt(i)} y={H - 10} textAnchor="middle" fill={i === 0 ? "#d0ee91" : "#f0f0e4"} opacity={i === 0 ? 0.9 : 0.4} fontSize={9} fontFamily="var(--font-mono), monospace" letterSpacing={1}>
            {label}
          </text>
        ))}

        {/* area + line */}
        <path d={areaPath} fill="url(#aqi-fill)" />
        <path d={linePath} fill="none" stroke="#d0ee91" strokeWidth={2} strokeLinejoin="round" />

        {/* NOW marker */}
        <line x1={xAt(0)} x2={xAt(0)} y1={MT} y2={MT + PH} stroke="#d0ee91" strokeOpacity={0.4} strokeWidth={1} strokeDasharray="2 4" />
        <circle cx={xAt(0)} cy={yAt(current.aqi)} r={3.5} fill="#d0ee91" />

        {/* peak marker */}
        <circle cx={xAt(peak.index)} cy={yAt(peak.aqi)} r={4} fill="none" stroke="#f49a6b" strokeWidth={1.5} />
        <circle cx={xAt(peak.index)} cy={yAt(peak.aqi)} r={1.6} fill="#f49a6b" />
        <text
          x={Math.min(peak.index > 30 ? xAt(peak.index) - 8 : xAt(peak.index) + 8, W - MR - 4)}
          y={Math.max(yAt(peak.aqi) - 10, MT + 10)}
          textAnchor={peak.index > 30 ? "end" : "start"}
          fill="#f49a6b"
          fontSize={9.5}
          fontFamily="var(--font-mono), monospace"
          letterSpacing={1}
        >
          PEAK {peak.aqi} · {peak.label}
        </text>

        {/* hover */}
        {hp && (
          <g>
            <line x1={tipX} x2={tipX} y1={MT} y2={MT + PH} stroke="#f0f0e4" strokeOpacity={0.35} strokeWidth={1} />
            <circle cx={tipX} cy={yAt(hp.aqi)} r={4} fill={hp.category.color} stroke="#091310" strokeWidth={1.5} />
            <g transform={`translate(${tipLeft ? tipX - 176 : tipX + 10}, ${MT + 6})`}>
              <rect width={166} height={46} fill="#0a1814" stroke="#f0f0e4" strokeOpacity={0.2} />
              <text x={10} y={19} fill="#f0f0e4" fontSize={11} fontFamily="var(--font-mono), monospace">
                {hp.label} · AQI {hp.aqi}
              </text>
              <text x={10} y={36} fill={hp.category.color} fontSize={9.5} fontFamily="var(--font-mono), monospace" letterSpacing={0.5}>
                {hp.category.name.toUpperCase()} · PM₂.₅ {hp.pm}
              </text>
            </g>
          </g>
        )}
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[9.5px] tracking-[0.14em] text-ivory/40">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4 bg-lime" /> AQI (EPA PM₂.₅)
        </span>
        <span>HOVER / TAP FOR HOURLY DETAIL</span>
        <span className="text-ivory/25">BANDS = AQI CATEGORIES</span>
      </figcaption>

      <details className="group mt-3">
        <summary className="cursor-pointer list-none font-mono text-[10px] tracking-[0.2em] text-lime/70 transition-colors hover:text-lime focus-visible:outline-2 focus-visible:outline-lime">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
          VIEW DATA TABLE (48 ROWS)
        </summary>
        <div className="mt-2 max-h-44 overflow-auto border border-ivory/10">
          <table className="w-full border-collapse text-left font-mono text-[10px]">
            <thead className="sticky top-0 bg-[#0a1814]">
              <tr className="text-ivory/50">
                <th scope="col" className="px-3 py-1.5 font-medium">TIME</th>
                <th scope="col" className="px-3 py-1.5 font-medium">AQI</th>
                <th scope="col" className="px-3 py-1.5 font-medium">CATEGORY</th>
                <th scope="col" className="px-3 py-1.5 font-medium">PM₂.₅ µg/m³</th>
              </tr>
            </thead>
            <tbody>
              {forecast.points.map((p) => (
                <tr key={p.i} className="border-t border-ivory/5 text-ivory/70">
                  <td className="px-3 py-1">{p.label}</td>
                  <td className="px-3 py-1">{p.aqi}</td>
                  <td className="px-3 py-1" style={{ color: p.category.color }}>
                    {p.category.short}
                  </td>
                  <td className="px-3 py-1">{p.pm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
