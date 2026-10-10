"use client";

import { useEffect, useRef, useState } from "react";

const CHAPTERS = ["ORBIT", "FIRE", "WIND", "INVERSION", "NEIGHBORHOOD"];

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      c.getContext("webgl2") ||
      c.getContext("webgl") ||
      c.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function formatT(p: number): string {
  const total = p * 60;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const d = Math.floor((total % 1) * 10);
  return `T+${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${d}`;
}

/** Static, honest fallback when WebGL is unavailable or the context is lost. */
function StaticFallback() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_20%,#0e211c_0%,#091310_62%)]">
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.14]"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="none" stroke="#9fc9b0" strokeWidth="1">
          {Array.from({ length: 9 }, (_, i) => (
            <ellipse key={i} cx="600" cy="400" rx={80 + i * 62} ry={52 + i * 40} />
          ))}
          {Array.from({ length: 13 }, (_, i) => (
            <line key={i} x1={i * 100 - 100} y1="0" x2={i * 100 + 140} y2="800" />
          ))}
        </g>
        <circle cx="600" cy="400" r="8" fill="#f49a6b" />
      </svg>
      <p className="absolute inset-x-0 bottom-10 mx-auto w-fit font-mono text-[10px] tracking-[0.3em] text-ivory/40">
        STATIC FIELD VIEW — 3D RENDERING UNAVAILABLE
      </p>
    </div>
  );
}

export default function SceneCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"loading" | "ready" | "fallback">("loading");
  const [reduced, setReduced] = useState(false);
  const tRef = useRef<HTMLSpanElement>(null);
  const camRef = useRef<HTMLSpanElement>(null);
  const chRef = useRef<HTMLSpanElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(rm);
    const canvas = canvasRef.current;
    if (!hasWebGL() || !canvas) {
      setMode("fallback");
      return;
    }

    let disposed = false;
    let handles: {
      setProgress(p: number): void;
      setStaticFrame(p: number): void;
      dispose(): void;
    } | null = null;
    let st: { kill(): void } | null = null;

    (async () => {
      const mod = await import("@/three/GlobeScene");
      if (disposed || !canvasRef.current) return;
      try {
        handles = await mod.createGlobeScene(canvasRef.current, {
          quality: window.innerWidth < 768 ? "low" : "high",
          reducedMotion: rm,
          onContextLost: () => setMode("fallback"),
          onInfo: (info) => {
            if (tRef.current) tRef.current.textContent = formatT(info.progress);
            if (camRef.current)
              camRef.current.textContent = `CAM ${info.lat.toFixed(2)}°N ${info.lng.toFixed(2)}°E · ALT ${Math.max(0, Math.round((info.dist - 1) * 6371)).toLocaleString("en-US")} KM`;
            if (chRef.current)
              chRef.current.textContent = `CH.0${info.chapter} ${CHAPTERS[info.chapter - 1]}`;
            if (pctRef.current)
              pctRef.current.textContent = `${String(Math.round(info.progress * 100)).padStart(2, "0")}%`;
          },
        });
        if (disposed) {
          handles.dispose();
          return;
        }
        setMode("ready");
        if (rm) {
          handles.setStaticFrame(0.02);
          return;
        }
        const { gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);
        const journey = document.getElementById("journey");
        if (!journey) return;
        st = ScrollTrigger.create({
          trigger: journey,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.9,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (!handles || !canvasRef.current) return;
            handles.setProgress(self.progress);
            const dim =
              1 - 0.72 * Math.min(1, Math.max(0, (self.progress - 0.88) / 0.12));
            canvasRef.current.style.opacity = dim.toFixed(3);
          },
        });
      } catch (err) {
        console.error("3D scene failed to start", err);
        if (!disposed) setMode("fallback");
      }
    })();

    return () => {
      disposed = true;
      st?.kill();
      handles?.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      {/* atmospheric base gradients behind the transparent canvas */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_-10%,#0d211c_0%,#091310_58%)]" />
      {mode !== "fallback" && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full transition-opacity duration-1000"
          style={{ opacity: mode === "ready" ? 1 : 0 }}
        />
      )}
      {mode === "fallback" && <StaticFallback />}
      {mode === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-mono text-[10px] tracking-[0.35em] text-ivory/50">
            ACQUIRING ORBITAL VIEW
            <span className="inline-block w-1.5 animate-pulse">_</span>
          </p>
        </div>
      )}
      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(115%_95%_at_50%_45%,transparent_55%,rgba(5,12,10,0.75)_100%)]" />
      {/* instrument HUD */}
      {mode === "ready" && (
        <div className="absolute bottom-4 left-4 flex items-center gap-4 font-mono text-[10px] tracking-[0.22em] text-ivory/45 md:bottom-6 md:left-8">
          <span ref={tRef} className="text-lime/80">
            T+00:00.0
          </span>
          <span className="hidden sm:inline" ref={camRef}>
            CAM —
          </span>
          <span ref={chRef}>CH.01 ORBIT</span>
          <span className="hidden sm:inline" ref={pctRef}>
            00%
          </span>
        </div>
      )}
      {mode === "ready" && reduced && (
        <p className="absolute bottom-12 left-4 font-mono text-[10px] tracking-[0.22em] text-ivory/40 md:left-8">
          REDUCED MOTION — STATIC VIEW
        </p>
      )}
    </div>
  );
}
