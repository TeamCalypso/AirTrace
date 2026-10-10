"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Forecast } from "@/lib/forecast";
import { aqiCategory, compassLabel } from "@/lib/geo";

type Hit = {
  slug: string;
  name: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  profile: string;
  baselinePm25: number;
  distanceKm?: number;
};

const W = 760;
const H = 230;
const MX = 44;
const MT = 18;
const MB = 34;

export default function ForecastPanel({
  onSelectPlace,
  initialSlug = "connaught-place",
}: {
  onSelectPlace?: (place: { name: string; lat: number; lng: number; slug: string | null }) => void;
  initialSlug?: string;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Hit | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [contact, setContact] = useState("");
  const [threshold, setThreshold] = useState(200);
  const [signup, setSignup] = useState<{ ok: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [subCount, setSubCount] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (slug?: string, lat?: number, lng?: number, label?: string) => {
    setLoading(true);
    setSignup(null);
    try {
      const url = slug
        ? `/api/forecast?slug=${encodeURIComponent(slug)}`
        : `/api/forecast?lat=${lat}&lng=${lng}&label=${encodeURIComponent(label ?? "Your location")}`;
      const res = await fetch(url);
      const data = (await res.json()) as Forecast;
      setForecast(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // shareable deep link: ?place=dwarka#you
    const shared = new URLSearchParams(window.location.search).get("place");
    if (shared) {
      void load(shared);
      const target = document.getElementById("you");
      if (target) window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
      return;
    }
    void load(initialSlug);
    fetch("/api/subscribe")
      .then((r) => r.json())
      .then((d: { subscribers: number }) => setSubCount(d.subscribers))
      .catch(() => setSubCount(null));
  }, [load, initialSlug]);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/neighborhoods?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d: { results: Hit[] }) => setHits(d.results ?? []))
        .catch(() => setHits([]));
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const choose = (hit: Hit) => {
    setPlace(hit);
    setQuery(hit.name);
    setOpen(false);
    onSelectPlace?.({ name: hit.name, lat: hit.lat, lng: hit.lng, slug: hit.slug });
    void load(hit.slug, hit.lat, hit.lng, hit.name);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetch(`/api/neighborhoods?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
          .then((r) => r.json())
          .then((d: { results: Hit[] }) => {
            if (d.results?.length) choose(d.results[0]);
          })
          .catch(() => undefined);
      },
      () => undefined,
      { timeout: 8000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          aqiThreshold: threshold,
          neighborhoodSlug: place?.slug ?? null,
          neighborhoodName: place?.name ?? forecast?.label ?? null,
          lat: place?.lat ?? forecast?.lat,
          lng: place?.lng ?? forecast?.lng,
          source: "journey",
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; error?: string; subscribers?: number };
      setSignup({ ok: Boolean(data.ok), message: data.message ?? data.error ?? "Something went wrong." });
      if (data.subscribers) setSubCount(data.subscribers);
    } catch {
      setSignup({ ok: false, message: "Network error — try again." });
    } finally {
      setSending(false);
    }
  };

  const chart = useMemo(() => {
    if (!forecast) return null;
    const hours = forecast.hours;
    const maxV = Math.max(...hours.map((h) => h.high)) * 1.06;
    const innerW = W - MX - 12;
    const innerH = H - MT - MB;
    const x = (i: number) => MX + (i / (hours.length - 1)) * innerW;
    const y = (v: number) => MT + innerH - (v / maxV) * innerH;
    const line = hours.map((h, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(h.pm25).toFixed(1)}`).join(" ");
    const band =
      `M${x(0)},${y(hours[0].low)} ` +
      hours.map((h, i) => `L${x(i).toFixed(1)},${y(h.low).toFixed(1)}`).join(" ") +
      " " +
      [...hours].reverse().map((h, i) => `L${x(hours.length - 1 - i).toFixed(1)},${y(h.high).toFixed(1)}`).join(" ") +
      " Z";
    const area = `${line} L${x(hours.length - 1)},${MT + innerH} L${x(0)},${MT + innerH} Z`;
    return { hours, maxV, x, y, line, band, area, innerW, innerH };
  }, [forecast]);

  const active = hover !== null && forecast ? forecast.hours[hover] : null;
  const cat = forecast ? aqiCategory(forecast.peak.aqi) : null;

  return (
    <div className="w-full">
      {/* ---------------- search ---------------- */}
      <div ref={boxRef} className="relative z-20">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300/70">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 160)}
              placeholder="Type your neighbourhood — Anand Vihar, Dwarka, Sector 62 Noida…"
              className="w-full rounded-full border border-cyan-300/25 bg-slate-950/70 py-3.5 pl-12 pr-4 text-[15px] text-slate-100 outline-none backdrop-blur-xl transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:bg-slate-950/90 focus:shadow-[0_0_40px_-8px_rgba(56,189,248,0.55)]"
              aria-label="Search for your neighbourhood"
            />
            {open && hits.length > 0 && (
              <ul className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#04070f]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                {hits.map((h) => (
                  <li key={h.slug}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(h)}
                      className="flex w-full items-center justify-between gap-4 border-b border-white/5 px-4 py-3 text-left transition hover:bg-cyan-300/10"
                    >
                      <span>
                        <span className="block text-sm font-medium text-slate-100">{h.name}</span>
                        <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-500">
                          {h.district} · {h.state}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-cyan-200/80">
                        {h.profile}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-[13px] font-medium uppercase tracking-[0.16em] text-slate-200 transition hover:border-cyan-300/50 hover:text-white"
          >
            Use my location
          </button>
        </div>
      </div>

      {/* ---------------- readout ---------------- */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Now"
          value={loading ? "—" : `${forecast?.now.pm25 ?? 0}`}
          unit="µg/m³ PM2.5"
          tone={forecast?.now.color ?? "#38bdf8"}
          note={loading ? undefined : `AQI ${forecast?.now.aqi} · ${forecast?.now.category}`}
        />
        <Stat
          label="48 h peak"
          value={loading ? "—" : `${forecast?.peak.pm25 ?? 0}`}
          unit="µg/m³"
          tone={cat?.color ?? "#38bdf8"}
          note={loading ? undefined : forecast?.headline}
        />
        <Stat
          label="Smoke share"
          value={loading ? "—" : `${Math.round((forecast?.averages.smokeShare ?? 0) * 100)}`}
          unit="% of PM2.5"
          tone="#fb923c"
          note={loading ? undefined : `from ${forecast?.transport.sourceDistricts.slice(0, 2).join(", ")}`}
        />
        <Stat
          label="Upwind fires"
          value={loading ? "—" : `${forecast?.transport.fireCount ?? 0}`}
          unit={`· ${forecast?.transport.travelHours ?? 0} h transit`}
          tone="#f97316"
          note={loading ? undefined : `${forecast?.transport.distanceKm} km away`}
        />
      </div>

      {/* ---------------- chart ---------------- */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#050a14]/80 p-4 backdrop-blur-xl sm:p-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/70">48-hour forecast</p>
            <h3 className="mt-1 text-xl font-medium text-white">{forecast?.label ?? "Loading…"}</h3>
          </div>
          <p className="max-w-md text-[12px] leading-relaxed text-slate-400">
            Shaded columns are night. The lower strip is the boundary layer — watch it collapse and the line jump.
          </p>
        </div>

        {chart && forecast && (
          <div className="relative" onPointerLeave={() => setHover(null)}>
            <svg
              viewBox={`0 0 ${W} ${H + 62}`}
              className="w-full touch-none"
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const px = ((e.clientX - rect.left) / rect.width) * W;
                const i = Math.round(((px - MX) / chart.innerW) * (forecast.hours.length - 1));
                setHover(Math.max(0, Math.min(forecast.hours.length - 1, i)));
              }}
            >
              <defs>
                <linearGradient id="pmArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.42" />
                  <stop offset="55%" stopColor="#a855f7" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* night columns */}
              {chart.hours.map((h, i) =>
                h.hourOfDay >= 19 || h.hourOfDay <= 6 ? (
                  <rect
                    key={`n${i}`}
                    x={chart.x(i) - chart.innerW / 94}
                    y={MT}
                    width={chart.innerW / 47}
                    height={chart.innerH}
                    fill="#0b1730"
                    opacity="0.55"
                  />
                ) : null
              )}

              {/* gridlines */}
              {[0, 100, 200, 300, 400, 500].filter((v) => v < chart.maxV).map((v) => (
                <g key={v}>
                  <line x1={MX} x2={W - 12} y1={chart.y(v)} y2={chart.y(v)} stroke="#ffffff" strokeOpacity="0.07" />
                  <text x={MX - 8} y={chart.y(v) + 3.5} textAnchor="end" fontSize="9" fill="#64748b">
                    {v}
                  </text>
                </g>
              ))}

              {/* confidence band */}
              <path d={chart.band} fill="#f97316" fillOpacity="0.12" />
              <path d={chart.area} fill="url(#pmArea)" />

              {/* pm2.5 line, segment-coloured by category */}
              {chart.hours.slice(0, -1).map((h, i) => (
                <line
                  key={`s${i}`}
                  x1={chart.x(i)}
                  y1={chart.y(h.pm25)}
                  x2={chart.x(i + 1)}
                  y2={chart.y(chart.hours[i + 1].pm25)}
                  stroke={chart.hours[i + 1].color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ))}

              {/* peak marker */}
              <g>
                <line
                  x1={chart.x(forecast.peak.i)}
                  x2={chart.x(forecast.peak.i)}
                  y1={MT}
                  y2={MT + chart.innerH}
                  stroke="#f8fafc"
                  strokeOpacity="0.35"
                  strokeDasharray="3 4"
                />
                <circle cx={chart.x(forecast.peak.i)} cy={chart.y(forecast.peak.pm25)} r="4" fill="#fff" />
              </g>

              {/* hour ticks */}
              {chart.hours.map((h, i) =>
                i % 6 === 0 ? (
                  <text key={`t${i}`} x={chart.x(i)} y={H - MB + 16} textAnchor="middle" fontSize="9" fill="#64748b">
                    {String(h.hourOfDay).padStart(2, "0")}:00
                  </text>
                ) : null
              )}

              {/* boundary-layer strip */}
              <g transform={`translate(0,${H - MB + 26})`}>
                <text x={MX} y="-6" fontSize="8.5" fill="#7dd3fc" opacity="0.75">
                  BOUNDARY LAYER (m)
                </text>
                {chart.hours.map((h, i) => {
                  const w = chart.innerW / 47;
                  const mh = (h.mixingHeight / 1750) * 26;
                  return (
                    <rect
                      key={`m${i}`}
                      x={chart.x(i) - w / 2}
                      y={30 - mh}
                      width={Math.max(1.4, w - 1)}
                      height={mh}
                      fill={h.mixingHeight < 400 ? "#f97316" : "#38bdf8"}
                      opacity={h.mixingHeight < 400 ? 0.85 : 0.5}
                      rx="0.6"
                    />
                  );
                })}
              </g>

              {/* hover cursor */}
              {hover !== null && (
                <g>
                  <line x1={chart.x(hover)} x2={chart.x(hover)} y1={MT} y2={MT + chart.innerH} stroke="#e2e8f0" strokeOpacity="0.5" />
                  <circle cx={chart.x(hover)} cy={chart.y(forecast.hours[hover].pm25)} r="4.5" fill="#fff" />
                </g>
              )}
            </svg>

            {active && (
              <div
                className="pointer-events-none absolute top-2 rounded-xl border border-white/15 bg-[#050a14]/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur"
                style={{
                  left: `calc(${((chart.x(active.i) / W) * 100).toFixed(2)}% + 10px)`,
                  transform: chart.x(active.i) > W * 0.72 ? "translateX(-115%)" : undefined,
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300/80">
                  +{active.i}h · {String(active.hourOfDay).padStart(2, "0")}:00 IST
                </p>
                <p className="mt-0.5 text-sm font-semibold" style={{ color: active.color }}>
                  {active.pm25} µg/m³ · AQI {active.aqi}
                </p>
                <p className="text-slate-400">
                  {active.windSpeed} m/s {compassLabel(active.windDirFrom)} · lid {active.mixingHeight} m
                </p>
                {active.trigger && <p className="mt-0.5 text-amber-300/90">{active.trigger}</p>}
              </div>
            )}
          </div>
        )}

        {forecast && (
          <p className="mt-5 border-t border-white/5 pt-4 text-[13px] leading-relaxed text-slate-300">{forecast.summary}</p>
        )}
      </div>

      {/* ---------------- signup ---------------- */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <form
          onSubmit={submit}
          className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-500/10 to-transparent p-5 backdrop-blur-xl sm:p-6"
        >
          <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300/80">Get the warning before the smoke</p>
          <h3 className="mt-2 text-xl font-medium text-white">48-hour alerts for {place?.name ?? forecast?.label ?? "your area"}</h3>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="you@email.com or +91XXXXXXXXXX"
              className="flex-1 rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-300/60"
              aria-label="Email or phone number"
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-semibold text-[#1a0d02] transition hover:brightness-110 disabled:opacity-50"
            >
              {sending ? "Saving…" : "Alert me"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-slate-500">Warn me at AQI</span>
            {[100, 200, 300, 400].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setThreshold(v)}
                className={`rounded-full border px-3 py-1 text-[11px] font-mono transition ${
                  threshold === v ? "border-amber-300 bg-amber-300/15 text-amber-200" : "border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {signup && (
            <p className={`mt-3 text-[13px] ${signup.ok ? "text-emerald-300" : "text-rose-300"}`}>{signup.message}</p>
          )}
          {subCount !== null && (
            <p className="mt-2 text-[11px] uppercase tracking-widest text-slate-500">
              {subCount.toLocaleString()} people already on the list
            </p>
          )}
        </form>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/70">What happens next</p>
          <ol className="mt-3 space-y-3 text-[13px] leading-relaxed text-slate-300">
            {(forecast?.advice ?? []).map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 font-mono text-[10px] text-cyan-300/70">0{i + 1}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {(forecast?.transport.sourceDistricts ?? []).map((d) => (
              <span key={d} className="rounded-full border border-orange-400/30 bg-orange-500/10 px-2.5 py-1 text-[11px] text-orange-200">
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit, tone, note }: { label: string; value: string; unit: string; tone: string; note?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tone}, transparent)` }} />
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-1.5 font-mono text-3xl font-light tabular-nums" style={{ color: tone }}>
        {value}
      </p>
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{unit}</p>
      {note && <p className="mt-2 text-[11px] leading-snug text-slate-400">{note}</p>}
    </div>
  );
}
