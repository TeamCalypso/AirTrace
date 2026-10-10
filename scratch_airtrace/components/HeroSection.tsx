"use client";

import { useEffect, useState } from "react";
import DecodeText from "./DecodeText";
import { OrbitIcon } from "./Icons";

const SOURCES = ["SENTINEL-5P · TROPOMI", "VIIRS I-BAND", "ERA-5 WINDS", "US EPA AQI"];

export default function HeroSection() {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setInView(true), 150);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section
      id="ch-orbit"
      data-chapter="01"
      aria-label="Chapter 1 — Orbit"
      className="relative min-h-[135svh]"
    >
      <div className="sticky top-0 flex h-svh flex-col justify-between overflow-hidden px-6 pb-8 pt-24 md:px-14 md:pt-20 lg:px-24">
        {/* top row */}
        <div
          className={`fade-reveal flex items-start justify-between gap-6 ${inView ? "is-in" : ""}`}
        >
          <p className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.28em] text-lime/90">
            <OrbitIcon className="h-4 w-4 text-ember" />
            <DecodeText text="CH.01 — ORBIT · S-5P PASS · ILLUSTRATIVE 09:12 UTC" />
          </p>
          <ul className="hidden flex-wrap justify-end gap-2 md:flex" aria-label="Data sources used in this explainer">
            {SOURCES.map((s) => (
              <li
                key={s}
                className="border border-ivory/20 px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] text-ivory/50"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* headline block */}
        <div className={`reveal max-w-4xl ${inView ? "is-in" : ""}`}>
          <p
            className={`fade-reveal mb-6 font-mono text-[10px] tracking-[0.32em] text-ivory/55 ${
              inView ? "is-in" : ""
            }`}
            style={{ transitionDelay: "150ms" }}
          >
            AIRTRACE — FIELD NOTES FROM THE ATMOSPHERE
          </p>
          <h1 className="f-display text-[clamp(2.7rem,7vw,6.1rem)] leading-[1.02] text-ivory">
            <span className="line-mask">
              <span style={{ transitionDelay: "200ms" }}>From 824 kilometres up,</span>
            </span>
            <span className="line-mask">
              <span style={{ transitionDelay: "360ms" }}>
                to <em className="text-lime">the street</em> you live on.
              </span>
            </span>
          </h1>
          <p
            className={`fade-reveal mt-7 max-w-md text-[15px] leading-relaxed text-ivory/70 ${
              inView ? "is-in" : ""
            }`}
            style={{ transitionDelay: "600ms" }}
          >
            A sixty-second descent through the machinery of an air-quality
            forecast — the satellite swath, the burn season, the wind, the lid —
            ending in a 48-hour outlook for Delhi–NCR.
          </p>
        </div>

        {/* scroll cue */}
        <div
          className={`fade-reveal absolute bottom-8 right-6 flex items-center gap-4 md:right-14 lg:right-24 ${
            inView ? "is-in" : ""
          }`}
          style={{ transitionDelay: "900ms" }}
          aria-hidden="true"
        >
          <span className="font-mono text-[9px] tracking-[0.32em] text-ivory/50">
            SCROLL — 60 SECONDS
          </span>
          <span className="relative block h-16 w-px overflow-hidden bg-ivory/15">
            <span className="animate-drip absolute inset-x-0 h-full bg-lime" />
          </span>
        </div>
      </div>
    </section>
  );
}
