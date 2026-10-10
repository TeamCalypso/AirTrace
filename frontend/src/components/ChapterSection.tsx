"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import DecodeText from "./DecodeText";
import type { Chapter } from "@/lib/chapters";
import { FireIcon, LayersIcon, WindIcon } from "./Icons";

const ICONS = { fire: FireIcon, wind: WindIcon, layers: LayersIcon };

/**
 * One chapter of the scroll journey: a tall section whose annotated
 * panel stays pinned (sticky) while the 3D scene scrubs behind it.
 */
export default function ChapterSection({
  ch,
  children,
}: {
  ch: Chapter;
  children?: ReactNode;
}) {
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
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Icon = ICONS[ch.icon];

  return (
    <section
      id={ch.id}
      data-chapter={ch.n}
      aria-label={`Chapter ${ch.n}`}
      className="relative min-h-[165svh]"
    >
      <div className="sticky top-0 flex h-svh w-full items-center overflow-hidden px-6 md:px-14 lg:px-24">
        <div className={`flex w-full ${ch.align === "right" ? "justify-end" : ""}`}>
          <article
            ref={ref}
            className={`panel-reveal relative w-full max-w-[32rem] border border-ivory/15 bg-[#0a1814]/85 p-7 backdrop-blur-[6px] md:p-10 ${
              inView ? "is-in" : ""
            }`}
          >
            <CornerTicks />
            <p className="mb-5 flex items-center gap-2.5 font-mono text-[10px] tracking-[0.28em] text-lime/90">
              <Icon className="h-3.5 w-3.5 text-ember" />
              <DecodeText text={ch.label} />
            </p>
            <h2 className="f-display mb-6 text-[2.1rem] leading-[1.04] text-ivory md:text-[2.9rem]">
              {ch.title.map((line, i) => (
                <span key={line} className="line-mask block">
                  <span
                    className="block"
                    style={{ transitionDelay: `${120 + i * 130}ms` }}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h2>
            <p className="mb-7 text-[15px] leading-relaxed text-ivory/75">
              {ch.body}
            </p>
            <ul className="mb-5 flex flex-wrap gap-2" aria-label="Data sources">
              {ch.chips.map((c) => (
                <li
                  key={c}
                  className="border border-ivory/20 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.18em] text-ivory/60"
                >
                  {c}
                </li>
              ))}
            </ul>
            <p className="font-mono text-[9.5px] leading-relaxed tracking-[0.08em] text-ivory/35">
              {ch.footnote}
            </p>
          </article>
        </div>
      </div>
      {children}
    </section>
  );
}

export function CornerTicks() {
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px h-3 w-3 border-l border-t border-lime/50" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-px -top-px h-3 w-3 border-r border-t border-lime/50" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b border-l border-lime/50" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b border-r border-lime/50" />
    </>
  );
}
