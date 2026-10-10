import SceneCanvas from "@/components/SceneCanvas";
import ProgressRail from "@/components/ProgressRail";
import HeroSection from "@/components/HeroSection";
import ChapterSection from "@/components/ChapterSection";
import NeighborhoodSection from "@/components/NeighborhoodSection";
import { CHAPTERS } from "@/lib/chapters";

const DATA_SOURCES = [
  {
    name: "SENTINEL-5P · TROPOMI",
    detail: "atmospheric composition — ESA / Copernicus (illustrative pass)",
  },
  {
    name: "VIIRS I-BAND",
    detail: "fire detections — NASA / NOAA NPP & S-NPP (illustrative)",
  },
  {
    name: "ERA-5 REANALYSIS",
    detail: "elevated winds — ECMWF (illustrative transport)",
  },
  {
    name: "US EPA AQI SCALE",
    detail: "PM₂.₅ breakpoints used for the demo categories",
  },
];

export default function AirtracePage() {
  return (
    <>
      <a href="#forecast" className="skip-link">
        SKIP TO THE NEIGHBORHOOD FORECAST
      </a>

      {/* header */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 md:px-14">
        <a
          href="#ch-orbit"
          className="pointer-events-auto flex items-center gap-3 font-mono text-[11px] tracking-[0.42em] text-ivory transition-colors hover:text-lime"
        >
          <span aria-hidden="true" className="block h-[3px] w-[3px] bg-lime" />
          AIRTRACE
        </a>
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="hidden border border-ivory/15 px-2.5 py-1 font-mono text-[9px] tracking-[0.25em] text-ivory/45 sm:inline">
            60-SECOND EXPLAINER
          </span>
          <a
            href="#forecast"
            className="border border-lime/50 px-3 py-1.5 font-mono text-[9px] tracking-[0.25em] text-lime transition-colors hover:bg-lime/10"
          >
            FORECAST →
          </a>
        </div>
      </header>

      <SceneCanvas />
      <ProgressRail />

      {/* the journey */}
      <main id="journey" className="relative z-10">
        <HeroSection />
        <ChapterSection ch={CHAPTERS.fire} />
        <ChapterSection ch={CHAPTERS.wind} />
        <ChapterSection ch={CHAPTERS.inversion} />
        <NeighborhoodSection />
      </main>

      {/* footer / attribution */}
      <footer className="relative z-10 border-t border-ivory/10 bg-ink/90 px-6 py-14 backdrop-blur-sm md:px-14">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="f-display mb-4 text-2xl text-ivory">
              About this prototype
            </h2>
            <p className="max-w-md text-[13.5px] leading-relaxed text-ivory/60">
              Airtrace is a design prototype for an air-quality explainer. It
              does not receive live satellite downlinks, does not publish live
              AQI, and is not an official or public-health forecast. The
              48-hour outlooks are deterministic, clearly labelled demo
              scenarios, and the alert signups you submit are stored to
              demonstrate the interaction — they do not trigger real-time
              warnings.
            </p>
          </div>
          <div>
            <h3 className="mb-4 font-mono text-[10px] tracking-[0.3em] text-ivory/50">
              DATA LAYER
            </h3>
            <ul className="space-y-3">
              {DATA_SOURCES.map((s) => (
                <li key={s.name} className="border-l border-ivory/15 pl-3">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-lime/80">
                    {s.name}
                  </p>
                  <p className="text-[12px] text-ivory/45">{s.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] leading-relaxed text-ivory/45">
              The data-fetching layer is intentionally pluggable — validated
              TROPOMI, VIIRS, ERA5, and CPCB monitor feeds can be connected
              behind the same API surface.
            </p>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-ivory/10 pt-6 font-mono text-[9px] tracking-[0.22em] text-ivory/35">
          <span>
            AIRTRACE PROTOTYPE v0.1 · ILLUSTRATIVE DATA ONLY · NOT AN OFFICIAL
            FORECAST
          </span>
          <span>NEXT.JS · THREE.JS · GSAP · POSTGRESQL</span>
        </div>
      </footer>
    </>
  );
}
