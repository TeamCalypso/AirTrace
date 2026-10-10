"use client";

import { useEffect, useRef, useState } from "react";
import ForecastPanel from "./ForecastPanel";
import { LABELS } from "@/lib/labels";
import { PIPELINE_STATS, SCENES } from "@/lib/places";

type Telemetry = { altitudeKm: number; lat: number; lng: number; elevation: number; fov: number; progress: number };

export default function Journey() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const railFillRef = useRef<HTMLDivElement | null>(null);
  const telemetryRef = useRef<HTMLSpanElement | null>(null);
  const sceneNameRef = useRef<HTMLSpanElement | null>(null);
  const engineRef = useRef<{ setProgress: (p: number) => void; setPin: (lat: number, lng: number, l: string) => void; clearPin: () => void; telemetry: () => Telemetry; resize: () => void; dispose: () => void; attachLabelLayer: (el: HTMLElement | null) => void } | null>(null);
  const [booted, setBooted] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | null = null;
    let engine: InstanceType<typeof import("@/three/engine").JourneyEngine> | null = null;
    const BOUNDS = [0.096, 0.287, 0.496, 0.687, 0.878];

    (async () => {
      const [{ JourneyEngine }, { default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("@/three/engine"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !canvasRef.current) return;
      gsap.registerPlugin(ScrollTrigger);
      try {
        engine = new JourneyEngine(canvasRef.current);
      } catch {
        setFailed(true);
        return;
      }
      engineRef.current = engine;
      engine.attachLabelLayer(labelRef.current);
      engine.setProgress(0);
      setBooted(true);

      const master = ScrollTrigger.create({
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          if (!engineRef.current) return;
          engineRef.current.setProgress(self.progress);
        },
      });

      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.fromTo(
            el,
            { y: 46, opacity: 0, filter: "blur(6px)" },
            {
              y: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: 1.05,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none reverse" },
            }
          );
        });
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count ?? "0");
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target,
            duration: 2.1,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 92%" },
            onUpdate: () => {
              el.textContent = Math.round(obj.v).toLocaleString("en-IN");
            },
          });
        });
        gsap.utils.toArray<HTMLElement>("[data-grow]").forEach((el) => {
          gsap.fromTo(
            el,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 1.6,
              ease: "power2.inOut",
              transformOrigin: "left center",
              scrollTrigger: { trigger: el, start: "top 92%", toggleActions: "play none none reverse" },
            }
          );
        });
      });

      let rafId = 0;
      let last = 0;
      const hud = () => {
        rafId = requestAnimationFrame(hud);
        const now = performance.now();
        if (now - last < 90 || !engineRef.current) return;
        last = now;
        const tel = engineRef.current.telemetry();
        if (telemetryRef.current) {
          telemetryRef.current.textContent = `ALT ${Math.round(tel.altitudeKm).toLocaleString("en-IN")} km   ·   ${Math.abs(
            tel.lat
          ).toFixed(2)}°${tel.lat >= 0 ? "N" : "S"} ${Math.abs(tel.lng).toFixed(2)}°${tel.lng >= 0 ? "E" : "W"}   ·   EL ${Math.round(
            tel.elevation
          )}°`;
        }
        if (railFillRef.current) {
          railFillRef.current.style.height = `${(tel.progress * 100).toFixed(2)}%`;
        }
        if (sceneNameRef.current) {
          const idx = Math.min(SCENES.length - 1, BOUNDS.filter((b) => tel.progress > b).length);
          sceneNameRef.current.textContent = `${SCENES[idx].index} · ${SCENES[idx].label.toUpperCase()}`;
        }
      };
      rafId = requestAnimationFrame(hud);

      const onResize = () => engineRef.current?.resize();
      window.addEventListener("resize", onResize);
      ScrollTrigger.refresh();

      teardown = () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", onResize);
        ctx.revert();
        master.kill();
      };
    })();

    return () => {
      cancelled = true;
      teardown?.();
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="fixed inset-0 z-0 h-full w-full" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-0 transition-opacity duration-[1600ms]"
        style={{ opacity: booted ? 1 : 0 }}
      >
        <div ref={labelRef} className="absolute inset-0">
          {LABELS.map((l) => (
            <div key={l.key} data-label={l.key} className="absolute left-0 top-0 will-change-transform">
              <div className="-translate-x-1/2 -translate-y-1/2 text-center">
                <div className="mx-auto mb-1 h-3 w-px bg-cyan-200/60" />
                <p
                  data-title
                  className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-50/90 [text-shadow:0_0_12px_rgba(8,20,40,0.95)]"
                >
                  {l.text}
                </p>
                {l.sub && (
                  <p
                    data-sub
                    className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-200/50 [text-shadow:0_0_10px_rgba(8,20,40,0.95)]"
                  >
                    {l.sub}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* film grain + vignette */}
      <div className="pointer-events-none fixed inset-0 z-[2] bg-[radial-gradient(120%_100%_at_50%_50%,transparent_45%,rgba(1,3,8,0.72)_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-[2] opacity-[0.055] mix-blend-overlay [background-image:url('/grain.svg')]" />

      {failed && (
        <div className="fixed inset-x-0 top-20 z-50 mx-auto w-fit rounded-full border border-amber-300/30 bg-amber-500/10 px-4 py-2 text-[12px] text-amber-200">
          WebGL unavailable — the story continues below.
        </div>
      )}

      {/* ---------------- HUD ---------------- */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-300/40 bg-cyan-400/10">
            <div className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_4px_rgba(34,211,238,0.55)]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold tracking-[0.22em] text-white">ATMOS/48</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/60">north-indian air pipeline</p>
          </div>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <span ref={sceneNameRef} className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/70">
            00 · ORBIT
          </span>
          <span className="h-3 w-px bg-white/20" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
            sentinel-5p · viirs · era5
          </span>
        </div>
      </header>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between gap-4 px-5 pb-4 sm:px-8">
        <span ref={telemetryRef} className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/50">
          ALT 21,670 km · 10.00°N 76.00°E · EL 3°
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:block">
          scroll to fly
        </span>
      </div>

      {/* ---------------- scene rail ---------------- */}
      <nav className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-4 sm:flex">
        <div className="relative flex flex-col items-end gap-4">
          <div className="absolute right-[5px] top-1 h-[calc(100%-8px)] w-px bg-white/10" />
          <div ref={railFillRef} className="absolute right-[5px] top-1 w-px bg-cyan-300 shadow-[0_0_10px_2px_rgba(34,211,238,0.6)]" style={{ height: 0 }} />
          {SCENES.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="group relative flex items-center gap-3 pr-4 text-right"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500 transition group-hover:text-cyan-200">
                {s.label}
              </span>
              <span className="relative z-10 block h-[11px] w-[11px] rounded-full border border-white/30 bg-[#03060d] transition group-hover:border-cyan-300 group-hover:bg-cyan-300/40" />
            </a>
          ))}
        </div>
      </nav>

      {/* ---------------- content ---------------- */}
      <main className="relative z-20">
        {/* ============ HERO ============ */}
        <section className="flex min-h-[108vh] flex-col justify-center px-5 pb-24 pt-32 sm:px-10 lg:px-20">
          <div className="max-w-4xl">
            <p data-reveal className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.34em] text-cyan-300/80">
              <span className="inline-block h-px w-10 bg-cyan-300/60" />
              how a forecast is made · 60 seconds
            </p>
            <h1 data-reveal className="text-[13vw] font-light leading-[0.86] tracking-[-0.03em] text-white sm:text-[8.5vw] lg:text-[6.4rem]">
              One breath of
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-orange-400 to-rose-500 bg-clip-text font-normal text-transparent">
                smoke
              </span>
              , traced
              <br />
              from orbit.
            </h1>
            <p data-reveal className="mt-8 max-w-xl text-[15px] leading-relaxed text-slate-300 sm:text-[17px]">
              A rice field is set alight in Punjab at 4 pm. Nineteen hours later its smoke is in a bedroom in Delhi.
              This is the pipeline — satellite, fire detections, winds, boundary layer — that turns those events into the
              number you check before you open a window.
            </p>
            <div data-reveal className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {[
                ["01", "Sentinel-5P", "TROPOMI, 824 km"],
                ["02", "VIIRS", "375 m fire pixels"],
                ["03", "ERA5 winds", "850 hPa transport"],
                ["04", "Boundary layer", "the lid"],
              ].map(([n, t, s]) => (
                <div key={n} className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] text-cyan-300/60">{n}</span>
                  <div>
                    <p className="text-[13px] font-medium text-white">{t}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">{s}</p>
                  </div>
                </div>
              ))}
            </div>
            <div data-reveal className="mt-14 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
              <span className="relative block h-10 w-px overflow-hidden bg-white/15">
                <span className="absolute inset-x-0 top-0 h-4 animate-[scrollcue_1.9s_ease-in-out_infinite] bg-cyan-300" />
              </span>
              scroll to descend
            </div>
          </div>
        </section>

        {/* ============ SCENE 01 — SATELLITE ============ */}
        <SceneShell id="orbit" height="h-[215vh]">
          <Panel side="right">
            <Kicker index="01" scene="orbit · 824 km" />
            <Title>First, a satellite smells the air.</Title>
            <Body>
              Sentinel-5P carries TROPOMI, a spectrometer that reads the sunlight scattered back out of the atmosphere.
              Its swath is 2,600 km wide, so one pass at 13:30 local time covers the entire Indo-Gangetic plain — every
              plume, every city, every kiln.
            </Body>
            <Body dim>
              What it gives us: aerosol index, carbon monoxide, nitrogen dioxide and ozone columns. It answers{" "}
              <em>where the smoke is thick enough to be seen from space</em> — hours before it reaches anyone.
            </Body>
            <Specs
              items={[
                ["Swath", `${PIPELINE_STATS.swathKm.toLocaleString("en-IN")} km`],
                ["Pixel", PIPELINE_STATS.tropomiPixel],
                ["Overpass", PIPELINE_STATS.overpass],
                ["Orbit", `${PIPELINE_STATS.orbitKm} km`],
              ]}
            />
          </Panel>
        </SceneShell>

        {/* ============ SCENE 02 — FIRES ============ */}
        <SceneShell id="fires" height="h-[235vh]">
          <Panel side="left">
            <Kicker index="02" scene="punjab &amp; haryana · 375 m" />
            <Title>Then we find the fires.</Title>
            <Body>
              VIIRS looks at the ground in the thermal infrared, four times a day, at 375 m. Any pixel hotter than its
              neighbours and behaving like a fire becomes a detection. On a peak November day, that is{" "}
              <strong className="font-mono text-orange-300">{PIPELINE_STATS.fireDetections.toLocaleString("en-IN")}</strong>{" "}
              points across {PIPELINE_STATS.districts} districts.
            </Body>
            <Body dim>
              Each point is a farmer clearing two or three acres of rice stubble in about twenty minutes — the cheapest
              way to clear a field before the wheat window closes. Multiply by a hundred thousand fields, and the map
              you are looking at becomes a single, coherent emission inventory.
            </Body>
            <div className="mt-7 grid grid-cols-3 gap-4">
              <Metric value={PIPELINE_STATS.fireDetections} label="detections / day" tone="#fb923c" />
              <Metric value={PIPELINE_STATS.districts} label="districts burning" tone="#f97316" />
              <Metric value={Math.round(PIPELINE_STATS.frpTotalMW / 1000)} label="gigawatts of FRP" tone="#fdba74" />
            </div>
          </Panel>
        </SceneShell>

        {/* ============ SCENE 03 — WIND ============ */}
        <SceneShell id="wind" height="h-[215vh]">
          <Panel side="right">
            <Kicker index="03" scene="850 hPa · transport" />
            <Title>The wind decides who breathes it.</Title>
            <Body>
              Post-monsoon north-westerlies sweep the plain at 3–6 m/s. A plume leaving Sangrur at four in the afternoon
              arrives over the capital between two and five the next morning — 250 to 350 km downwind.
            </Body>
            <Body dim>
              We advect every detection along reanalysis wind vectors, ageing the smoke as it travels. The model does not
              care about state borders; the plume does not either.
            </Body>
            <div className="mt-7 space-y-3">
              {[
                ["Transit time", "10–14 hours", 0.62],
                ["Distance", "≈ 300 km", 0.44],
                ["Plume age on arrival", "0.8 of lifetime", 0.8],
              ].map(([label, value, frac]) => (
                <div key={label as string}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</span>
                    <span className="font-mono text-[13px] text-cyan-100">{value}</span>
                  </div>
                  <div data-grow className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-white/8">
                    <div className="h-full w-full origin-left bg-gradient-to-r from-cyan-400 to-emerald-300" />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </SceneShell>

        {/* ============ SCENE 04 — INVERSION ============ */}
        <SceneShell id="lid" height="h-[215vh]">
          <Panel side="left">
            <Kicker index="04" scene="delhi · 28.61°n 77.21°e" />
            <Title>Then the sky puts a lid on it.</Title>
            <Body>
              On a calm winter night the boundary layer collapses — from roughly 1,400 m in the afternoon to 150 m
              before dawn. Same smoke, a tenth of the volume. Concentrations do not rise gently; they multiply.
            </Body>
            <Body dim>
              This single term — ventilation — is the difference between a &ldquo;poor&rdquo; day and a
              &ldquo;severe&rdquo; one, and it is the hardest thing to predict beyond about 48 hours.
            </Body>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">afternoon</p>
                <p className="mt-1 font-mono text-3xl text-cyan-100">1,400<span className="text-sm"> m</span></p>
                <p className="text-[11px] text-slate-500">mixed layer, 4 m/s wind</p>
              </div>
              <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-300/80">3 am</p>
                <p className="mt-1 font-mono text-3xl text-orange-200">150<span className="text-sm"> m</span></p>
                <p className="text-[11px] text-slate-500">inversion, calm, trapped</p>
              </div>
            </div>
          </Panel>
        </SceneShell>

        {/* ============ SCENE 05 — YOU ============ */}
        <section id="you" className="px-5 pb-24 pt-16 sm:px-10 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div data-reveal className="mb-10">
              <Kicker index="05" scene="your street · 48 hours" />
              <Title>Now put your address on it.</Title>
              <Body>
                Hyper-local means the same plume lands differently in Anand Vihar than it does in Vasant Kunj: an arterial
                corridor adds traffic, a ridge subtracts it, a landfill adds it back. Search your neighbourhood and watch
                the pin drop on the city behind this panel.
              </Body>
            </div>
            <div data-reveal>
              <ForecastPanel
                onSelectPlace={(p) => {
                  const engine = engineRef.current;
                  if (!engine) return;
                  engine.setPin(p.lat, p.lng, p.name);
                }}
              />
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer className="border-t border-white/10 px-5 py-16 sm:px-10 lg:px-20">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <p className="text-[13px] font-semibold tracking-[0.22em] text-white">ATMOS/48</p>
              <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-slate-400">
                A cinematic explainer for a satellite-driven, hyper-local air quality forecast. The scenes you just flew
                through are the actual pipeline: TROPOMI columns, VIIRS active fires, ERA5 transport, and a
                boundary-layer ventilation model, combined into 48 hourly values.
              </p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
                built with three.js · gsap scrolltrigger · postgres
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">Data sources</p>
              <ul className="mt-3 space-y-2 text-[12px] text-slate-400">
                <li>Copernicus Sentinel-5P TROPOMI (L2 AI, CO, NO₂)</li>
                <li>NOAA-20 / Suomi-NPP VIIRS 375 m active fire</li>
                <li>ECMWF ERA5 / HRRR winds &amp; boundary layer</li>
                <li>CPCB ground monitors (bias correction)</li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">Method &amp; caveats</p>
              <ul className="mt-3 space-y-2 text-[12px] text-slate-400">
                <li>Fire-to-air transport is a Lagrangian approximation.</li>
                <li>Confidence bands widen with lead time.</li>
                <li>Coastlines: Natural Earth 50m.</li>
                <li>Not a substitute for official advisories.</li>
              </ul>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------- pieces ------------------------------- */

function SceneShell({ id, height, children }: { id: string; height: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`${height} relative`}>
      <div className="sticky top-0 flex h-screen items-center px-5 sm:px-10 lg:px-20">{children}</div>
    </section>
  );
}

function Panel({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <div className={`w-full max-w-xl ${side === "right" ? "ml-auto" : ""}`}>
      <div className="rounded-[28px] border border-white/10 bg-[#050a14]/55 p-6 backdrop-blur-md sm:p-8">{children}</div>
    </div>
  );
}

function Kicker({ index, scene }: { index: string; scene: string }) {
  return (
    <p data-reveal className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">
      <span className="rounded-full border border-cyan-300/40 px-2 py-0.5 text-cyan-200">{index}</span>
      <span>{scene}</span>
    </p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 data-reveal className="mt-4 text-[8vw] font-light leading-[0.95] tracking-[-0.02em] text-white sm:text-4xl lg:text-[2.9rem]">
      {children}
    </h2>
  );
}

function Body({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <p data-reveal className={`mt-5 text-[14px] leading-relaxed sm:text-[15px] ${dim ? "text-slate-400" : "text-slate-200"}`}>
      {children}
    </p>
  );
}

function Specs({ items }: { items: [string, string][] }) {
  return (
    <div data-reveal className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{k}</p>
          <p className="mt-0.5 font-mono text-[13px] text-cyan-100">{v}</p>
        </div>
      ))}
    </div>
  );
}

function Metric({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div data-reveal>
      <p className="font-mono text-3xl font-light tabular-nums" style={{ color: tone }}>
        <span data-count={value}>0</span>
      </p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}
