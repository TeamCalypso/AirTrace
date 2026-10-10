"use client";

import { useEffect, useRef, useState } from "react";

const CHAPTERS = [
  { id: "ch-orbit", n: "01", name: "ORBIT" },
  { id: "ch-fire", n: "02", name: "FIRE" },
  { id: "ch-wind", n: "03", name: "WIND" },
  { id: "ch-inversion", n: "04", name: "INVERSION" },
  { id: "ch-neighborhood", n: "05", name: "NEIGHBORHOOD" },
];

/**
 * Fixed chapter rail (desktop) + hairline scroll progress (mobile).
 * Ticks are positioned from measured section offsets; clicking
 * smooth-scrolls to that chapter.
 */
export default function ProgressRail() {
  const [fracs, setFracs] = useState<number[]>([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const fillRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const fracsRef = useRef<number[]>([]);

  useEffect(() => {
    const measure = () => {
      const journey = document.getElementById("journey");
      if (!journey) return;
      const scrollable = Math.max(1, journey.offsetHeight - window.innerHeight);
      const tops = CHAPTERS.map((c) => {
        const el = document.getElementById(c.id);
        if (!el) return 0;
        const jTop = journey.getBoundingClientRect().top + window.scrollY;
        const eTop = el.getBoundingClientRect().top + window.scrollY;
        return Math.min(1, Math.max(0, (eTop - jTop) / scrollable));
      });
      fracsRef.current = tops;
      setFracs(tops);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const journey = document.getElementById("journey");
        if (!journey) return;
        const jTop = journey.getBoundingClientRect().top + window.scrollY;
        const scrollable = Math.max(1, journey.offsetHeight - window.innerHeight);
        const p = Math.min(1, Math.max(0, (window.scrollY - jTop) / scrollable));
        setProgress(p);
        if (fillRef.current) fillRef.current.style.height = `${p * 100}%`;
        if (topBarRef.current) topBarRef.current.style.width = `${p * 100}%`;
        let idx = 0;
        fracsRef.current.forEach((f, i) => {
          if (p >= f - 0.01) idx = i;
        });
        setActive(idx);
      });
    };

    measure();
    onScroll();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const goTo = (f: number) => {
    const journey = document.getElementById("journey");
    if (!journey) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const jTop = journey.getBoundingClientRect().top + window.scrollY;
    const scrollable = Math.max(1, journey.offsetHeight - window.innerHeight);
    window.scrollTo({
      top: jTop + f * scrollable + 2,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <>
      {/* desktop rail */}
      <nav
        aria-label="Chapters"
        className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 lg:block"
      >
        <div className="relative h-56 w-px bg-ivory/15">
          <div
            ref={fillRef}
            className="absolute left-0 top-0 w-px bg-lime/80"
            style={{ height: `${progress * 100}%` }}
          />
          {fracs.map((f, i) => (
            <button
              key={CHAPTERS[i].id}
              type="button"
              onClick={() => goTo(f)}
              aria-label={`Go to chapter ${CHAPTERS[i].n} — ${CHAPTERS[i].name}`}
              aria-current={active === i ? "true" : undefined}
              className="group absolute -left-[5px] flex -translate-y-1/2 items-center focus-visible:outline-2 focus-visible:outline-lime"
              style={{ top: `${f * 100}%` }}
            >
              <span
                className={`block h-[11px] w-[11px] rotate-45 border transition-colors duration-300 ${
                  active === i
                    ? "border-lime bg-lime/90"
                    : "border-ivory/40 bg-ink group-hover:border-lime/70"
                }`}
              />
              <span
                className={`ml-3 -translate-x-1 whitespace-nowrap font-mono text-[9px] tracking-[0.25em] transition-all duration-300 ${
                  active === i
                    ? "translate-x-0 text-lime"
                    : "text-ivory/35 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"
                }`}
              >
                {CHAPTERS[i].n} {CHAPTERS[i].name}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* mobile hairline progress */}
      <div
        className="fixed inset-x-0 top-0 z-30 h-[2px] bg-transparent lg:hidden"
        role="progressbar"
        aria-label="Journey progress"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div ref={topBarRef} className="h-full bg-lime/90" style={{ width: `${progress * 100}%` }} />
      </div>
    </>
  );
}
