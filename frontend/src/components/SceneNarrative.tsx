'use client';

import React from 'react';
import { SCENES } from '@/data/airtraceData';
import { ArrowDown, ChevronRight, Layers, Satellite, Flame, Wind, CloudFog, MapPin } from 'lucide-react';

interface Props {
  currentScene: number;
  onNextScene: () => void;
  onJumpToForecast: () => void;
}

export const SceneNarrative: React.FC<Props> = ({
  currentScene,
  onNextScene,
  onJumpToForecast,
}) => {
  const scene = SCENES[Math.min(currentScene, SCENES.length - 1)];

  const getSceneIcon = (idx: number) => {
    switch (idx) {
      case 0:
        return <Satellite className="w-4 h-4 text-[#D0EE91]" />;
      case 1:
        return <Flame className="w-4 h-4 text-[#F49A6B]" />;
      case 2:
        return <Wind className="w-4 h-4 text-[#D0EE91]" />;
      case 3:
        return <CloudFog className="w-4 h-4 text-[#F49A6B]" />;
      case 4:
      default:
        return <MapPin className="w-4 h-4 text-[#D0EE91]" />;
    }
  };

  // If on final forecast scene, we let ForecastProduct take full focus
  if (currentScene === 4) {
    return null;
  }

  return (
    <aside className="fixed left-4 sm:left-8 md:left-12 top-24 bottom-24 z-30 flex items-center pointer-events-none w-[calc(100vw-32px)] sm:w-[460px] max-w-full">
      <div className="field-panel reticle-corner p-6 sm:p-7 rounded-2xl pointer-events-auto transition-all duration-500 transform shadow-2xl">
        {/* Sensor Chip & Chapter Header */}
        <div className="flex items-center justify-between gap-3 mb-4 border-b border-[rgba(208,238,145,0.12)] pb-3">
          <div className="flex items-center gap-2">
            {getSceneIcon(scene.id)}
            <span className="font-telemetry text-xs font-semibold text-[#D0EE91] tracking-wider">
              {scene.chapter}
            </span>
            <span className="text-xs text-[#F0F0E4]/40 font-mono">/</span>
            <span className="font-telemetry text-[11px] text-[#F0F0E4]/70 uppercase">
              {scene.title}
            </span>
          </div>

          <div className="px-2 py-0.5 rounded bg-[#102622] border border-[#D0EE91]/20 text-[10px] font-telemetry text-[#D0EE91]/90">
            {scene.sensorChip.split('·')[0].trim()}
          </div>
        </div>

        {/* Editorial Serif Headline */}
        <h1 className="font-editorial text-2xl sm:text-3xl lg:text-[2.2rem] font-medium leading-[1.15] text-[#F0F0E4] mb-3">
          {scene.serifHeadline}
        </h1>

        {/* Subtitle / Instrument summary */}
        <div className="font-telemetry text-xs text-[#D0EE91]/80 mb-4 pb-2 border-b border-[rgba(240,240,228,0.06)]">
          {scene.subtitle}
        </div>

        {/* Narrative Body Copy */}
        <p className="text-sm text-[#F0F0E4]/80 leading-relaxed font-normal mb-5 font-sans">
          {scene.body}
        </p>

        {/* Technical Telemetry HUD Grid */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#091310]/80 border border-[rgba(240,240,228,0.08)] mb-5">
          {scene.technicalTelemetry.map((item) => (
            <div key={item.label} className="flex flex-col">
              <span className="font-telemetry text-[10px] text-[#F0F0E4]/50">
                {item.label}
              </span>
              <span className="font-telemetry text-xs font-semibold text-[#D0EE91]">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Scientific Takeaway Callout */}
        <div className="p-3 rounded-xl bg-[#102622]/60 border border-[#D0EE91]/15 text-xs text-[#F0F0E4]/90 leading-relaxed mb-5">
          <span className="text-[#D0EE91] font-semibold mr-1.5 font-telemetry">[PHYSICS NOTE]</span>
          {scene.keyFact}
        </div>

        {/* Source Attribution & Navigation */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-[11px] font-telemetry text-[#F0F0E4]/40 truncate max-w-[210px]">
            {scene.sourceAttribution}
          </div>

          <div className="flex items-center gap-2">
            {currentScene === 0 ? (
              <button
                onClick={onNextScene}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#D0EE91] text-[#091310] font-telemetry text-xs font-semibold hover:bg-[#c2eb73] transition-all hover:scale-105"
              >
                <span>Scroll to Begin</span>
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              </button>
            ) : (
              <button
                onClick={onNextScene}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#102622] border border-[#D0EE91]/30 text-[#D0EE91] font-telemetry text-xs font-medium hover:bg-[#15342e] transition-colors"
              >
                <span>Next Scene</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
