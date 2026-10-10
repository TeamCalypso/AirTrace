"use client";

import { useEffect, useRef, useState } from "react";
import DecodeText from "./DecodeText";
import ForecastPanel from "./ForecastPanel";
import { NEIGHBORHOOD_CHAPTER } from "@/lib/chapters";
import { PinIcon } from "./Icons";

export default function NeighborhoodSection() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id={NEIGHBORHOOD_CHAPTER.id}
      data-chapter={NEIGHBORHOOD_CHAPTER.n}
      aria-label="Chapter 5 — Neighborhood forecast"
      className="relative"
    >
      <div className="flex min-h-svh items-center px-6 py-24 md:px-14 lg:px-24">
        <div className="mx-auto w-full max-w-4xl">
          <article
            ref={ref}
            className={`panel-reveal relative mb-10 w-full border border-ivory/15 bg-[#0a1814]/85 p-7 backdrop-blur-[6px] md:p-10 ${
              inView ? "is-in" : ""
            }`}
          >
            <p className="mb-5 flex items-center gap-2.5 font-mono text-[10px] tracking-[0.28em] text-lime/90">
              <PinIcon className="h-3.5 w-3.5 text-ember" />
              <DecodeText text={NEIGHBORHOOD_CHAPTER.label} />
            </p>
            <h2 className="f-display mb-6 text-[2.2rem] leading-[1.04] text-ivory md:text-[3rem]">
              {NEIGHBORHOOD_CHAPTER.title.map((line, i) => (
                <span key={line} className="line-mask block">
                  <span style={{ transitionDelay: `${120 + i * 130}ms` }}>{line}</span>
                </span>
              ))}
            </h2>
            <p className="text-[15px] leading-relaxed text-ivory/75">
              {NEIGHBORHOOD_CHAPTER.body}
            </p>
          </article>

          <div id="forecast" className="scroll-mt-24">
            <ForecastPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
