"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Forecast } from "@/lib/forecast";
import { THRESHOLD_OPTIONS, validateEmail } from "@/lib/validation";
import AqiChart from "./AqiChart";
import { BellIcon, CheckIcon, PinIcon, SearchIcon } from "./Icons";

interface Suggestion {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
}

type AlertState =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "success"; created: boolean; message: string; note?: string }
  | { type: "error"; message: string };

export default function ForecastPanel() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const [threshold, setThreshold] = useState<number>(150);
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({ type: "idle" });

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef(0);

  /* ---------------- suggestions ---------------- */
  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    if (query.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const json = (await res.json()) as { results?: Suggestion[] };
        if (res.ok && json.results) {
          setSuggestions(json.results);
          setOpen(true);
          setActiveIdx(-1);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => window.clearTimeout(debounceRef.current);
  }, [query]);

  /* ---------------- forecast ---------------- */
  const loadForecast = useCallback(async (nb: Suggestion) => {
    setSelected(nb);
    setOpen(false);
    setLoadingForecast(true);
    setForecastError(null);
    setAlert({ type: "idle" });
    try {
      const res = await fetch(`/api/forecast?id=${encodeURIComponent(nb.id)}`);
      const json = (await res.json()) as { data?: Forecast; error?: string };
      if (res.ok && json.data) {
        setForecast(json.data);
      } else {
        setForecast(null);
        setForecastError(json.error ?? "Could not load the scenario.");
      }
    } catch {
      setForecast(null);
      setForecastError("Could not reach the forecast service.");
    } finally {
      setLoadingForecast(false);
    }
  }, []);

  /* ---------------- keyboard nav ---------------- */
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (open && activeIdx >= 0 && suggestions[activeIdx]) {
        e.preventDefault();
        setQuery(suggestions[activeIdx].name);
        void loadForecast(suggestions[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  /* ---------------- alert submit ---------------- */
  const submitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const err = validateEmail(email);
    setEmailErr(err);
    if (err) return;
    setAlert({ type: "submitting" });
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          neighborhoodId: selected.id,
          neighborhoodName: selected.name,
          threshold,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        created?: boolean;
        error?: string;
        message?: string;
        note?: string;
      };
      if (res.ok && json.ok) {
        setAlert({
          type: "success",
          created: !!json.created,
          message: json.message ?? "Subscribed.",
          note: json.note,
        });
      } else {
        setAlert({ type: "error", message: json.error ?? "Something went wrong." });
      }
    } catch {
      setAlert({ type: "error", message: "Network error — please try again." });
    }
  };

  return (
    <div className="w-full">
      {/* search */}
      <div className="mb-6">
        <label
          htmlFor="nb-search"
          className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] text-ivory/60"
        >
          <SearchIcon className="h-3.5 w-3.5 text-lime" />
          NEIGHBORHOOD · DELHI–NCR
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id="nb-search"
            type="text"
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="nb-listbox"
            aria-activedescendant={
              open && activeIdx >= 0 ? `nb-opt-${activeIdx}` : undefined
            }
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="Type an area — e.g. Karol Bagh, Okhla, Dwarka…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setForecast(null);
              setSelected(null);
              setForecastError(null);
            }}
            onKeyDown={onInputKeyDown}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            className="w-full border border-ivory/25 bg-[#0a1814]/80 px-4 py-3.5 font-mono text-sm text-ivory placeholder:text-ivory/30 focus:border-lime/70 focus:outline-none"
          />
          {open && suggestions.length > 0 && (
            <ul
              id="nb-listbox"
              role="listbox"
              aria-label="Neighborhood suggestions"
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto border border-ivory/20 bg-[#0a1814]/95 backdrop-blur-sm"
            >
              {suggestions.map((s, i) => (
                <li key={s.id} id={`nb-opt-${i}`} role="option" aria-selected={i === activeIdx}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery(s.name);
                      void loadForecast(s);
                    }}
                    className={`flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === activeIdx ? "bg-lime/10" : "hover:bg-lime/5"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm text-ivory">
                      <PinIcon className="h-3.5 w-3.5 shrink-0 text-lime/70" />
                      {s.name}
                      <span className="font-mono text-[9px] tracking-[0.15em] text-ivory/40">
                        {s.zone.toUpperCase()}
                      </span>
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.1em] text-ivory/35">
                      {s.lat.toFixed(2)}°N {s.lng.toFixed(2)}°E
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searching && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-[0.25em] text-ivory/40">
              SCANNING
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] tracking-[0.25em] text-ivory/35">
            QUICK SELECT —
          </span>
          {["karol-bagh", "dwarka", "okhla", "rohini", "vasant-kunj"].map((id) => {
            const name =
              id === "karol-bagh"
                ? "Karol Bagh"
                : id === "dwarka"
                  ? "Dwarka"
                  : id === "okhla"
                    ? "Okhla"
                    : id === "rohini"
                      ? "Rohini"
                      : "Vasant Kunj";
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setQuery(name);
                  void loadForecast({ id, name, zone: "", lat: 0, lng: 0 });
                }}
                className="border border-ivory/20 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.15em] text-ivory/60 transition-colors hover:border-lime/60 hover:text-lime focus-visible:outline-2 focus-visible:outline-lime"
              >
                {name.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* loading */}
      {loadingForecast && (
        <div className="flex items-center gap-3 border border-ivory/15 bg-[#0a1814]/70 p-6">
          <span className="h-2 w-2 animate-pulse bg-lime" />
          <span className="font-mono text-[10px] tracking-[0.25em] text-ivory/60">
            RESOLVING 48-HOUR SCENARIO FOR {selected?.name.toUpperCase()}…
          </span>
        </div>
      )}

      {forecastError && (
        <p className="border border-ember/40 bg-ember/10 p-4 font-mono text-[11px] tracking-[0.05em] text-ember" role="alert">
          {forecastError}
        </p>
      )}

      {/* result */}
      {forecast && selected && (
        <div className="border border-ivory/15 bg-[#0a1814]/80 p-5 backdrop-blur-[6px] md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-ivory/10 pb-5">
            <div>
              <h3 className="f-display text-3xl text-ivory md:text-4xl">
                {forecast.neighborhood.name}
              </h3>
              <p className="mt-1.5 font-mono text-[10px] tracking-[0.2em] text-ivory/45">
                {forecast.neighborhood.zone.toUpperCase()} ·{" "}
                {forecast.neighborhood.lat.toFixed(4)}°N{" "}
                {forecast.neighborhood.lng.toFixed(4)}°E · {forecast.startClock}
              </p>
            </div>
            <span className="border border-ember/50 px-2.5 py-1.5 font-mono text-[9px] tracking-[0.22em] text-ember">
              DEMO SCENARIO
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
            {/* current conditions */}
            <div className="flex flex-col justify-between gap-6">
              <div>
                <p className="mb-1 font-mono text-[9px] tracking-[0.25em] text-ivory/45">
                  CURRENT (SCENARIO CLOCK)
                </p>
                <p
                  className="f-mono-num text-[64px] leading-none md:text-[72px]"
                  style={{ color: forecast.current.category.color }}
                >
                  {forecast.current.aqi}
                </p>
                <p
                  className="mt-2 font-mono text-[11px] tracking-[0.2em]"
                  style={{ color: forecast.current.category.color }}
                >
                  {forecast.current.category.name.toUpperCase()}
                </p>
                <p className="mt-4 font-mono text-[11px] leading-relaxed tracking-[0.08em] text-ivory/60">
                  PM₂.₅ {forecast.current.pm} µg/m³
                  <br />
                  {forecast.scale}
                </p>
              </div>
              <dl className="space-y-3 border-t border-ivory/10 pt-4 font-mono text-[10px] tracking-[0.12em]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ivory/45">PEAK ESTIMATE</dt>
                  <dd className="text-ember">
                    {forecast.peak.aqi} @ {forecast.peak.label}
                  </dd>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between gap-3">
                    <dt className="text-ivory/45">MODEL AGREEMENT</dt>
                    <dd className="text-lime">
                      {forecast.confidence.value}% ·{" "}
                      {forecast.confidence.label.toUpperCase()}
                    </dd>
                  </div>
                  <div className="h-[3px] w-full bg-ivory/10" aria-hidden="true">
                    <div
                      className="h-full bg-lime/80"
                      style={{ width: `${forecast.confidence.value}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ivory/45">SCENARIO SEED</dt>
                  <dd className="text-ivory/60">0x{forecast.seedHex}</dd>
                </div>
              </dl>
            </div>

            {/* chart */}
            <AqiChart forecast={forecast} />
          </div>

          {/* alert signup */}
          <div className="mt-8 border-t border-ivory/10 pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] text-ivory/60">
                <BellIcon className="h-3.5 w-3.5 text-lime" />
                THRESHOLD ALERT · {selected.name.toUpperCase()}
              </p>
              <p className="font-mono text-[9px] tracking-[0.15em] text-ivory/30">
                PROTOTYPE — NO REAL-TIME WARNINGS SENT
              </p>
            </div>

            {alert.type === "success" ? (
              <div
                className="flex items-start gap-3 border border-lime/40 bg-lime/[0.07] p-4"
                role="status"
              >
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                <div>
                  <p className="text-sm text-ivory">
                    {alert.message}
                    {!alert.created && (
                      <span className="ml-2 font-mono text-[9px] tracking-[0.15em] text-lime/70">
                        (DUPLICATE — ALREADY STORED)
                      </span>
                    )}
                  </p>
                  {alert.note && (
                    <p className="mt-1 font-mono text-[9.5px] leading-relaxed tracking-[0.08em] text-ivory/45">
                      {alert.note}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAlert({ type: "idle" });
                      setEmail("");
                    }}
                    className="mt-2 font-mono text-[10px] tracking-[0.2em] text-lime/80 underline-offset-4 hover:text-lime hover:underline focus-visible:outline-2 focus-visible:outline-lime"
                  >
                    ADD ANOTHER THRESHOLD
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitAlert} noValidate className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
                <div>
                  <label
                    htmlFor="alert-threshold"
                    className="mb-1.5 block font-mono text-[9px] tracking-[0.25em] text-ivory/50"
                  >
                    ALERT WHEN AQI ≥
                  </label>
                  <select
                    id="alert-threshold"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full border border-ivory/25 bg-[#0a1814] px-3 py-3 font-mono text-xs text-ivory focus:border-lime/70 focus:outline-none"
                  >
                    {THRESHOLD_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="alert-email"
                    className="mb-1.5 block font-mono text-[9px] tracking-[0.25em] text-ivory/50"
                  >
                    EMAIL
                  </label>
                  <input
                    id="alert-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailErr) setEmailErr(null);
                    }}
                    aria-invalid={emailErr ? true : undefined}
                    aria-describedby={emailErr ? "alert-email-err" : undefined}
                    className={`w-full border bg-[#0a1814] px-3 py-3 font-mono text-xs text-ivory placeholder:text-ivory/25 focus:outline-none ${
                      emailErr ? "border-ember/70" : "border-ivory/25 focus:border-lime/70"
                    }`}
                  />
                  {emailErr && (
                    <p id="alert-email-err" className="mt-1.5 font-mono text-[10px] tracking-[0.08em] text-ember" role="alert">
                      {emailErr}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={alert.type === "submitting"}
                  className="border border-lime/70 bg-lime/10 px-6 py-3 font-mono text-[10px] tracking-[0.25em] text-lime transition-colors hover:bg-lime/20 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                >
                  {alert.type === "submitting" ? "STORING…" : "SUBSCRIBE"}
                </button>
                <div className="md:col-span-3" aria-live="polite">
                  {alert.type === "error" && (
                    <p className="border border-ember/40 bg-ember/10 p-3 font-mono text-[10.5px] tracking-[0.08em] text-ember" role="alert">
                      {alert.message}
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>

          <p className="mt-6 font-mono text-[9.5px] leading-relaxed tracking-[0.06em] text-ivory/35">
            {forecast.disclaimer} Signups are stored in the prototype database to
            demonstrate the interaction and are not acted upon.
          </p>
        </div>
      )}
    </div>
  );
}
