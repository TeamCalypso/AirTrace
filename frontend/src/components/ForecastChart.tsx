'use client';

import React, { useRef } from 'react';
import type { HourlyForecast } from '@/types';

interface Props {
  forecast: HourlyForecast[];
  activeHour: number;
  onHoverHour: (idx: number) => void;
}

export function getAqiColor(aqi: number): string {
  if (aqi <= 50) return '#68BA7F'; // Good - Soft green
  if (aqi <= 100) return '#99D066'; // Satisfactory - Lime
  if (aqi <= 200) return '#E3C153'; // Moderate - Warm yellow
  if (aqi <= 300) return '#F49A6B'; // Poor - Firelight coral
  if (aqi <= 400) return '#E05A47'; // Very Poor - Warm red
  return '#9A3A80'; // Severe/Hazardous - Deep mauve/purple
}

export const ForecastChart: React.FC<Props> = ({
  forecast,
  activeHour,
  onHoverHour,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const WIDTH = 680;
  const HEIGHT = 140;
  const MAX_AQI = 520;
  const N = forecast.length;

  if (N === 0) return null;

  // Calculate coordinates
  const getX = (idx: number) => (idx / (N - 1)) * WIDTH;
  const getY = (val: number) => HEIGHT - (Math.min(val, MAX_AQI) / MAX_AQI) * HEIGHT;

  // Points for median curve (p50)
  const medianPoints = forecast.map((f, i) => `${getX(i).toFixed(1)},${getY(f.aqi).toFixed(1)}`).join(' ');

  // Points for uncertainty band (p90 on top, then p10 back to start)
  const bandTop = forecast.map((f, i) => `${getX(i).toFixed(1)},${getY(f.pm25_p90 / 0.62).toFixed(1)}`);
  const bandBottom = [...forecast]
    .reverse()
    .map((f, i) => `${getX(N - 1 - i).toFixed(1)},${getY(f.pm25_p10 / 0.62).toFixed(1)}`);
  const bandPolygon = [...bandTop, ...bandBottom].join(' ');

  // Active hover line coordinates
  const activeX = getX(activeHour);
  const activePoint = forecast[activeHour] || forecast[0];
  const activeY = getY(activePoint.aqi);
  const activeColor = getAqiColor(activePoint.aqi);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const index = Math.round(ratio * (N - 1));
    onHoverHour(index);
  };

  return (
    <div className="w-full relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-36 overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        role="img"
        aria-label="48-hour probabilistic air quality forecast chart"
      >
        <defs>
          {/* Gradient for median line */}
          <linearGradient id="chartMedianGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D0EE91" />
            <stop offset="35%" stopColor="#F49A6B" />
            <stop offset="70%" stopColor="#E05A47" />
            <stop offset="100%" stopColor="#9A3A80" />
          </linearGradient>

          {/* Gradient for confidence band */}
          <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={activeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={activeColor} stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Horizontal Threshold Guideline Grid */}
        {[100, 200, 300, 400].map((level) => {
          const yPos = getY(level);
          return (
            <g key={level}>
              <line
                x1={0}
                y1={yPos}
                x2={WIDTH}
                y2={yPos}
                stroke="rgba(240, 240, 228, 0.08)"
                strokeDasharray="4 6"
                strokeWidth={1}
              />
              <text
                x={WIDTH - 6}
                y={yPos - 4}
                textAnchor="end"
                className="font-telemetry text-[9px] fill-[#F0F0E4]/30"
              >
                AQI {level}
              </text>
            </g>
          );
        })}

        {/* Confidence Uncertainty Ribbon (p10 to p90) */}
        <polygon points={bandPolygon} fill="url(#bandGrad)" />

        {/* Median Forecast Polyline (p50) */}
        <polyline
          points={medianPoints}
          fill="none"
          stroke="url(#chartMedianGrad)"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active Hover Crosshair Line */}
        <line
          x1={activeX}
          y1={0}
          x2={activeX}
          y2={HEIGHT}
          stroke="rgba(208, 238, 145, 0.45)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        {/* Active Data Focal Circle */}
        <circle
          cx={activeX}
          cy={activeY}
          r={5.5}
          fill={activeColor}
          stroke="#091310"
          strokeWidth={2}
          style={{ filter: `drop-shadow(0 0 6px ${activeColor})` }}
        />
      </svg>

      {/* Timeline X-Axis Ticks */}
      <div className="flex justify-between items-center text-[10px] font-telemetry text-[#F0F0E4]/40 mt-1 px-1">
        <span>+0h (Now)</span>
        <span>+12h</span>
        <span>+24h (Tomorrow)</span>
        <span>+36h</span>
        <span>+48h Horizon</span>
      </div>
    </div>
  );
};
