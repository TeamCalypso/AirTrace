'use client';

import React, { useState } from 'react';
import { NEIGHBORHOODS } from '@/data/airtraceData';
import type { NeighborhoodData, HourlyForecast } from '@/types';
import { ForecastChart, getAqiColor } from './ForecastChart';
import { AlertModal } from './AlertModal';
import {
  Search,
  MapPin,
  Bell,
  TrendingUp,
  Clock,
  Compass,
  Layers,
  ShieldAlert,
  ChevronDown,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface Props {
  selectedNeighborhood: NeighborhoodData;
  onSelectNeighborhood: (n: NeighborhoodData) => void;
}

export const ForecastProduct: React.FC<Props> = ({
  selectedNeighborhood,
  onSelectNeighborhood,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHourIdx, setActiveHourIdx] = useState(0);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Search filtering
  const filteredNeighborhoods = NEIGHBORHOODS.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      n.name.toLowerCase().includes(q) ||
      n.zone.toLowerCase().includes(q) ||
      (n.pincode ? n.pincode.includes(q) : false)
    );
  });

  const activeHour: HourlyForecast =
    selectedNeighborhood.forecast[activeHourIdx] || selectedNeighborhood.forecast[0];
  const activeColor = getAqiColor(activeHour.aqi);

  // Quick select pills
  const quickSelectIds = ['anand-vihar', 'connaught-place', 'dwarka-sec8', 'rohini-sec16', 'noida-sec62'];

  return (
    <section className="relative z-30 max-w-5xl mx-auto px-4 py-8 pointer-events-auto">
      {/* Search Header & Quick Selector */}
      <div className="field-panel reticle-corner p-5 sm:p-6 rounded-2xl mb-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-telemetry text-xs text-[#D0EE91] font-semibold tracking-wider">
                CH. 05 / 05 · NEIGHBORHOOD RESOLUTION
              </span>
              <span className="text-xs text-[#F0F0E4]/40 font-mono">/</span>
              <span className="font-telemetry text-[11px] text-[#F0F0E4]/60">
                DELHI-NCR 3 KM GRID
              </span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-medium text-[#F0F0E4]">
              Explore 48-Hour Street Outlook
            </h2>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#F0F0E4]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search ward or pincode (e.g. Anand Vihar, 110001)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#091310] border border-[rgba(240,240,228,0.12)] text-xs text-[#F0F0E4] placeholder-[#F0F0E4]/40 focus:outline-none focus:border-[#D0EE91] transition-colors"
            />

            {/* Suggestions Dropdown */}
            {isDropdownOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#091310] border border-[#D0EE91]/25 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 p-1.5">
                {filteredNeighborhoods.length > 0 ? (
                  filteredNeighborhoods.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        onSelectNeighborhood(n);
                        setIsDropdownOpen(false);
                        setSearchQuery('');
                        setActiveHourIdx(0);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs hover:bg-[#102622] text-[#F0F0E4] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#D0EE91]" />
                        <span>{n.name}</span>
                        <span className="text-[10px] text-[#F0F0E4]/40 font-telemetry">
                          ({n.zone})
                        </span>
                      </div>
                      <span
                        className="font-telemetry text-xs font-bold"
                        style={{ color: getAqiColor(n.currentAqi) }}
                      >
                        AQI {n.currentAqi}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-[#F0F0E4]/50 text-center font-telemetry">
                    No matching station found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[rgba(240,240,228,0.06)]">
          <span className="font-telemetry text-[11px] text-[#F0F0E4]/40 mr-1">
            KEY RECEPTORS:
          </span>
          {quickSelectIds.map((id) => {
            const found = NEIGHBORHOODS.find((n) => n.id === id);
            if (!found) return null;
            const isSelected = selectedNeighborhood.id === found.id;
            return (
              <button
                key={found.id}
                onClick={() => {
                  onSelectNeighborhood(found);
                  setActiveHourIdx(0);
                }}
                className={`px-3 py-1 rounded-full text-xs font-telemetry transition-all ${
                  isSelected
                    ? 'bg-[#D0EE91] text-[#091310] font-semibold shadow-sm'
                    : 'bg-[#102622]/80 border border-[rgba(240,240,228,0.08)] text-[#F0F0E4]/70 hover:border-[#D0EE91]/30 hover:text-[#F0F0E4]'
                }`}
              >
                {found.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Neighborhood Condition & Outlook Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column: Current Conditions Card */}
        <div className="field-panel reticle-corner p-6 rounded-2xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="font-telemetry text-[11px] text-[#D0EE91] block mb-1">
                  ZONE: {selectedNeighborhood.zone.toUpperCase()} NCR · PIN {selectedNeighborhood.pincode}
                </span>
                <h3 className="font-editorial text-3xl font-semibold text-[#F0F0E4]">
                  {selectedNeighborhood.name}
                </h3>
              </div>

              {/* Status Badge */}
              <div
                className="px-3 py-1 rounded-full font-telemetry text-xs font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${getAqiColor(selectedNeighborhood.currentAqi)}20`,
                  color: getAqiColor(selectedNeighborhood.currentAqi),
                  border: `1px solid ${getAqiColor(selectedNeighborhood.currentAqi)}40`,
                }}
              >
                {selectedNeighborhood.currentCategory}
              </div>
            </div>

            {/* Primary AQI & PM2.5 Metric */}
            <div className="my-6 p-4 rounded-xl bg-[#091310]/80 border border-[rgba(208,238,145,0.12)]">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-telemetry text-xs text-[#F0F0E4]/60">
                  CURRENT AIR QUALITY INDEX
                </span>
                <span className="font-telemetry text-[11px] text-[#D0EE91]">
                  LIGHTGBM QUANTILE
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span
                  className="font-telemetry text-5xl font-extrabold tracking-tight"
                  style={{ color: getAqiColor(selectedNeighborhood.currentAqi) }}
                >
                  {selectedNeighborhood.currentAqi}
                </span>
                <div className="font-telemetry text-xs text-[#F0F0E4]/70 leading-tight">
                  <div>PM₂.₅: <strong className="text-[#F0F0E4]">{selectedNeighborhood.currentPm25}</strong> µg/m³</div>
                  <div className="text-[10px] text-[#F0F0E4]/40">WHO 24h Guideline: 15 µg/m³</div>
                </div>
              </div>
            </div>

            {/* Diagnostic Telemetry Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs font-telemetry mb-5">
              <div className="p-2.5 rounded-lg bg-[#102622]/40 border border-[rgba(240,240,228,0.06)]">
                <span className="text-[10px] text-[#F0F0E4]/50 block">NOCTURNAL LID</span>
                <span className="text-[#F49A6B] font-semibold">142 m AGL</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#102622]/40 border border-[rgba(240,240,228,0.06)]">
                <span className="text-[10px] text-[#F0F0E4]/50 block">SURFACE BREEZE</span>
                <span className="text-[#D0EE91] font-semibold">3.2 km/h (Calm)</span>
              </div>
            </div>

            {/* Dominant Source Breakdown Tag */}
            <div className="p-3 rounded-xl bg-[#091310]/60 border border-[rgba(240,240,228,0.06)] text-xs text-[#F0F0E4]/80 leading-relaxed">
              <span className="text-[#D0EE91] font-semibold block mb-0.5 font-telemetry">
                [SOURCE ATTRIBUTION]
              </span>
              {selectedNeighborhood.dominantSource}
            </div>
          </div>

          {/* Trigger Alert Button */}
          <button
            onClick={() => setIsAlertModalOpen(true)}
            className="w-full mt-6 py-2.5 px-4 rounded-xl bg-[#102622] border border-[#D0EE91]/35 text-[#D0EE91] font-telemetry text-xs font-semibold hover:bg-[#163830] transition-all flex items-center justify-center gap-2 group shadow-lg"
          >
            <Bell className="w-4 h-4 text-[#D0EE91] group-hover:scale-110 transition-transform" />
            <span>Set Threshold Alert for {selectedNeighborhood.name}</span>
          </button>
        </div>

        {/* Right 2 Columns: 48-Hour Interactive Quantile Trend Chart & Scrubber */}
        <div className="lg:col-span-2 field-panel reticle-corner p-6 rounded-2xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <span className="font-telemetry text-xs text-[#D0EE91] font-semibold tracking-wider block">
                  PROBABILISTIC HORIZON (48 HOURS)
                </span>
                <h4 className="font-editorial text-2xl font-medium text-[#F0F0E4]">
                  PM₂.₅ Quantile Forecast Envelope
                </h4>
              </div>

              {/* Scrubber Status Display */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#091310] border border-[rgba(208,238,145,0.15)]">
                <Clock className="w-3.5 h-3.5 text-[#D0EE91]" />
                <span className="font-telemetry text-xs font-medium text-[#F0F0E4]">
                  {activeHour.timeLabel}
                </span>
                <span
                  className="font-telemetry text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${activeColor}20`,
                    color: activeColor,
                  }}
                >
                  AQI {activeHour.aqi}
                </span>
              </div>
            </div>

            {/* Interactive Trend Chart */}
            <div className="py-2">
              <ForecastChart
                forecast={selectedNeighborhood.forecast}
                activeHour={activeHourIdx}
                onHoverHour={setActiveHourIdx}
              />
            </div>

            {/* Active Hour Granular Diagnostic Panel */}
            <div className="mt-5 p-4 rounded-xl bg-[#091310]/90 border border-[rgba(208,238,145,0.12)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(240,240,228,0.06)] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-telemetry text-xs text-[#D0EE91] font-semibold">
                    TIMELINE DETAIL:
                  </span>
                  <span className="font-telemetry text-xs text-[#F0F0E4]">
                    {activeHour.timeLabel}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-telemetry text-xs">
                  <span className="text-[#F0F0E4]/60">
                    Optimistic (p10): <strong className="text-[#D0EE91]">{activeHour.pm25_p10} µg</strong>
                  </span>
                  <span className="text-[#F0F0E4]/30">|</span>
                  <span className="text-[#F0F0E4]/60">
                    Pessimistic (p90): <strong className="text-[#F49A6B]">{activeHour.pm25_p90} µg</strong>
                  </span>
                </div>
              </div>

              {/* Source Breakdown Bar */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-telemetry text-[#F0F0E4]/70 mb-1.5">
                  <span>Advected Smoke: {activeHour.sourceBreakdown.stubble}%</span>
                  <span>Inversion Trapping: {activeHour.sourceBreakdown.stagnationFactor}%</span>
                  <span>Local Activity: {activeHour.sourceBreakdown.local}%</span>
                </div>
                <div className="h-2 w-full bg-[#102622] rounded-full overflow-hidden flex">
                  <div
                    className="bg-[#F49A6B] h-full"
                    style={{ width: `${activeHour.sourceBreakdown.stubble}%` }}
                    title="Agricultural Stubble Advection"
                  />
                  <div
                    className="bg-[#9A3A80] h-full"
                    style={{ width: `${activeHour.sourceBreakdown.stagnationFactor}%` }}
                    title="Nocturnal Inversion Trapping"
                  />
                  <div
                    className="bg-[#D0EE91] h-full"
                    style={{ width: `${activeHour.sourceBreakdown.local}%` }}
                    title="Local Vehicles & Dust"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Windows: Best vs Worst Outdoor Periods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-[#102622]/40 border border-[#D0EE91]/20">
              <div className="flex items-center gap-1.5 text-xs font-telemetry text-[#D0EE91] font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>OPTIMAL VENTILATION WINDOW</span>
              </div>
              <div className="font-telemetry text-xs text-[#F0F0E4] font-medium mb-1">
                {selectedNeighborhood.bestWindow.time} · AQI {selectedNeighborhood.bestWindow.aqi}
              </div>
              <p className="text-[11px] text-[#F0F0E4]/60 leading-normal">
                {selectedNeighborhood.bestWindow.tip}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#102622]/40 border border-[#F49A6B]/20">
              <div className="flex items-center gap-1.5 text-xs font-telemetry text-[#F49A6B] font-semibold mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>HAZARDOUS ACCUMULATION PEAK</span>
              </div>
              <div className="font-telemetry text-xs text-[#F0F0E4] font-medium mb-1">
                {selectedNeighborhood.worstWindow.time} · AQI {selectedNeighborhood.worstWindow.aqi}
              </div>
              <p className="text-[11px] text-[#F0F0E4]/60 leading-normal">
                {selectedNeighborhood.worstWindow.tip}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Atmospheric Physics Briefing & Data Integrity Notice */}
      <div className="field-panel reticle-corner p-5 sm:p-6 rounded-2xl mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <Info className="w-4 h-4 text-[#D0EE91]" />
              <span className="font-telemetry text-xs text-[#D0EE91] font-semibold tracking-wider">
                SYNOPTIC BRIEFING · {selectedNeighborhood.name.toUpperCase()}
              </span>
            </div>
            <h4 className="font-editorial text-xl font-medium text-[#F0F0E4] mb-2">
              {selectedNeighborhood.scientificBriefing?.headline || 'Atmospheric Advection Dynamics'}
            </h4>
            <p className="text-xs text-[#F0F0E4]/80 leading-relaxed mb-3">
              {selectedNeighborhood.scientificBriefing?.synopsis || 'Regional transport and nocturnal boundary layer compression dictate local exposure.'}
            </p>
            <div className="text-xs font-telemetry text-[#D0EE91]/90">
              Driver: {selectedNeighborhood.scientificBriefing?.meteorologicalDriver || 'Planetary boundary layer collapse and synoptic wind'}
            </div>
          </div>

          {/* Compliance & Data Integrity Badge */}
          <div className="p-3.5 rounded-xl bg-[#091310] border border-[rgba(240,240,228,0.12)] text-[11px] text-[#F0F0E4]/60 max-w-sm shrink-0 font-sans">
            <span className="text-[#D0EE91] font-semibold font-telemetry block mb-1">
              [DATA INTEGRITY NOTICE]
            </span>
            This forecast is a deterministic illustrative scenario fusing ESA Sentinel-5P TROPOMI, NASA FIRMS VIIRS, and ECMWF ERA5 advection models. Prototype alert signups do not dispatch emergency warnings.
          </div>
        </div>
      </div>

      {/* Threshold Alert Modal */}
      {isAlertModalOpen && (
        <AlertModal
          neighborhood={selectedNeighborhood}
          onClose={() => setIsAlertModalOpen(false)}
        />
      )}
    </section>
  );
};
