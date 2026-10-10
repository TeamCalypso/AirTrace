'use client';

import React from 'react';
import { SCENES } from '@/data/airtraceData';
import { Compass, Eye, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface Props {
  currentScene: number;
  onSelectScene: (idx: number) => void;
  isReducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

export const FieldHUD: React.FC<Props> = ({
  currentScene,
  onSelectScene,
  isReducedMotion,
  onToggleReducedMotion,
}) => {
  const scene = SCENES[Math.min(currentScene, SCENES.length - 1)];

  return (
    <>
      {/* Top Header & Field Banner */}
      <header className="fixed top-0 left-0 right-0 z-40 px-5 py-4 pointer-events-none flex items-center justify-between">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D0EE91]/20 bg-[#091310]/80 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#D0EE91] beacon-pulse inline-block" />
            <span className="font-telemetry text-xs font-semibold tracking-wider text-[#D0EE91]">
              AIRTRACE
            </span>
            <span className="text-[10px] text-[#F0F0E4]/40 font-mono">v2.4-PROB</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(240,240,228,0.08)] bg-[#091310]/60 backdrop-blur-md">
            <Compass className="w-3.5 h-3.5 text-[#D0EE91]/70" />
            <span className="font-telemetry text-[11px] text-[#F0F0E4]/70">
              TARGET: 28°36&apos;N 77°12&apos;E (DELHI-NCR)
            </span>
          </div>
        </div>

        {/* Top Right Controls & Forecast Jump */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleReducedMotion}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgba(240,240,228,0.1)] bg-[#091310]/70 text-[#F0F0E4]/80 text-xs font-telemetry hover:border-[#D0EE91]/40 transition-colors"
            title="Toggle reduced motion"
            aria-pressed={isReducedMotion}
          >
            <Eye className="w-3 h-3 text-[#D0EE91]" />
            <span className="hidden md:inline">{isReducedMotion ? 'Motion: Static' : 'Motion: Fluid'}</span>
          </button>

          <button
            onClick={() => onSelectScene(4)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D0EE91] text-[#091310] font-telemetry text-xs font-medium hover:bg-[#bde472] transition-transform active:scale-95 shadow-md shadow-[#D0EE91]/15"
          >
            <span>Jump to Forecast</span>
            <span className="text-[10px] bg-[#091310]/15 px-1 rounded">Ch. 05</span>
          </button>
        </div>
      </header>

      {/* Bottom Timeline & Chapter Scrubber */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 px-5 py-4 pointer-events-none">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto p-2.5 rounded-2xl border border-[#D0EE91]/15 bg-[#091310]/85 backdrop-blur-xl">
          {/* Timeline progress indicator */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {SCENES.map((s, idx) => {
              const isActive = currentScene === idx;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectScene(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-telemetry transition-all duration-300 ${
                    isActive
                      ? 'bg-[#102622] border border-[#D0EE91]/40 text-[#D0EE91] shadow-sm'
                      : 'text-[#F0F0E4]/50 hover:text-[#F0F0E4]/90 hover:bg-[#102622]/40'
                  }`}
                  aria-label={`Go to ${s.title}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#D0EE91]' : 'bg-[#F0F0E4]/30'}`} />
                  <span className="hidden md:inline">{s.chapter.split('/')[0].trim()}</span>
                  <span className="text-[11px]">{s.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Time elapsed meter (60-second explainer pace) */}
          <div className="flex items-center gap-4 text-xs font-telemetry text-[#F0F0E4]/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[#D0EE91]">{String(scene.timeSeconds).padStart(2, '0')}s</span>
              <span className="text-[#F0F0E4]/30">/</span>
              <span>60s</span>
            </div>
            <div className="w-16 h-1 bg-[#102622] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D0EE91] transition-all duration-500 ease-out"
                style={{ width: `${((currentScene + 1) / SCENES.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
