'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, Bell, CheckCircle2, AlertTriangle, ShieldCheck, Mail } from 'lucide-react';
import type { NeighborhoodData } from '@/types';

interface Props {
  neighborhood: NeighborhoodData;
  onClose: () => void;
}

export const AlertModal: React.FC<Props> = ({ neighborhood, onClose }) => {
  const [email, setEmail] = useState('');
  const [threshold, setThreshold] = useState(300);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic client validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          neighborhoodId: neighborhood.id,
          neighborhoodName: neighborhood.name,
          thresholdAqi: threshold,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Subscription failed');
      }

      setIsDone(true);
      setStatusMessage(data.message);

      // Trigger celebratory confetti micro-animation
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#D0EE91', '#F49A6B', '#102622'],
        });
      } catch {
        // Ignore confetti failure in test environments
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving alert preferences.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091310]/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div className="field-panel reticle-corner w-full max-w-md p-6 sm:p-7 rounded-2xl relative shadow-2xl animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#F0F0E4]/50 hover:text-[#F0F0E4] hover:bg-[#102622] transition-colors"
          aria-label="Close alert modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!isDone ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-[#102622] border border-[#D0EE91]/25 text-[#D0EE91]">
                <Bell className="w-4 h-4" />
              </span>
              <span className="font-telemetry text-xs text-[#D0EE91] font-semibold tracking-wider">
                AIRTRACE THRESHOLD DISPATCH
              </span>
            </div>

            <h3 id="alert-modal-title" className="font-editorial text-2xl font-semibold text-[#F0F0E4] mb-2">
              Alert Subscriptions for {neighborhood.name}
            </h3>

            <p className="text-xs text-[#F0F0E4]/70 leading-relaxed mb-5">
              Receive automated briefings 12 hours before forecast AQI crosses your chosen safety threshold.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div>
                <label htmlFor="alert-email" className="block text-xs font-telemetry text-[#F0F0E4]/70 mb-1.5">
                  COMMUNICATION EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#F0F0E4]/40" />
                  <input
                    id="alert-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@fieldnotes.org"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#091310] border border-[rgba(240,240,228,0.14)] text-sm text-[#F0F0E4] placeholder-[#F0F0E4]/30 focus:outline-none focus:border-[#D0EE91] transition-colors"
                  />
                </div>
              </div>

              {/* Threshold Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="alert-thresh-slider" className="text-xs font-telemetry text-[#F0F0E4]/70">
                    DISPATCH THRESHOLD
                  </label>
                  <span className="font-telemetry text-xs font-bold text-[#F49A6B]">
                    AQI &gt; {threshold}
                  </span>
                </div>

                <input
                  id="alert-thresh-slider"
                  type="range"
                  min={150}
                  max={450}
                  step={50}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-[#D0EE91] bg-[#102622] rounded-lg h-2 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] font-telemetry text-[#F0F0E4]/40 mt-1">
                  <span>150 (Moderate)</span>
                  <span>300 (Poor)</span>
                  <span>450 (Hazardous)</span>
                </div>
              </div>

              {/* Sample Dispatch Payload */}
              <div className="p-3 rounded-xl bg-[#091310]/90 border border-[rgba(240,240,228,0.08)] text-xs text-[#F0F0E4]/80 leading-relaxed font-mono">
                <span className="text-[#D0EE91] font-semibold block mb-0.5 font-telemetry">[SAMPLE ADVISORY]</span>
                &quot;Airtrace: {neighborhood.name} is forecast to reach AQI {threshold} tomorrow at 06:00 AM due to nocturnal inversion collapse.&quot;
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/60 border border-red-500/30 text-xs text-red-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#D0EE91] text-[#091310] font-telemetry text-xs font-semibold hover:bg-[#c2eb73] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Registering Subscription...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Activate Alert Subscription</span>
                  </>
                )}
              </button>

              <div className="text-[10px] text-[#F0F0E4]/40 text-center leading-normal">
                Persisted securely via Drizzle ORM. Idempotent across repeated updates.
              </div>
            </form>
          </>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#102622] border border-[#D0EE91]/40 flex items-center justify-center text-[#D0EE91]">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="font-editorial text-2xl font-semibold text-[#F0F0E4]">
              Subscription Registered
            </h3>

            <p className="text-xs text-[#F0F0E4]/80 leading-relaxed">
              {statusMessage || `Alerts configured for ${neighborhood.name} when AQI exceeds ${threshold}.`}
            </p>

            <div className="p-3 rounded-xl bg-[#102622]/50 border border-[#D0EE91]/15 text-[11px] text-[#D0EE91]/90">
              [DEMO MODE VERIFICATION] Prototype signup recorded. Repeat submissions will idempotently update this threshold.
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-[#102622] border border-[#D0EE91]/30 text-[#D0EE91] text-xs font-telemetry hover:bg-[#163830] transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
