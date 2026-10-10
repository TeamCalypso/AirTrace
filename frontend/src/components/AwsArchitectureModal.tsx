"use client";

import React, { useEffect } from "react";
import { CornerTicks } from "./ChapterSection";

interface AwsArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AWS_LAYERS = [
  {
    layer: "01. INGESTION",
    service: "AWS Lambda + EventBridge Scheduler",
    color: "#d0ee91",
    desc: "Scheduled serverless functions pull Copernicus Sentinel-5P TROPOMI swaths, NASA FIRMS VIIRS 375m fire detections, and OpenAQ/CPCB monitors hourly into our regional lake.",
    badge: "SERVERLESS INGEST",
  },
  {
    layer: "02. DATA LAKE",
    service: "Amazon S3",
    color: "#f49a6b",
    desc: "Stores raw netCDF4 satellite cubes, weather reanalysis grids (ERA-5), and processed geo-tiles with automated S3 lifecycle transitions and parquet partitioning.",
    badge: "GEO-RASTER LAKE",
  },
  {
    layer: "03. ML TRAINING",
    service: "Amazon SageMaker",
    color: "#d0ee91",
    desc: "Trains LightGBM quantile regression models (P10, P50, P90) fusing satellite aerosol optical depth, thermal hotspot counts, boundary layer heights, and wind vectors.",
    badge: "QUANTILE ML",
  },
  {
    layer: "04. INFERENCE & CACHE",
    service: "AWS Lambda + Amazon DynamoDB",
    color: "#f49a6b",
    desc: "SageMaker Processing publishes 48-hour forecasted grids every 6 hours. Lambda serves sub-15ms queries cached in DynamoDB indexed by neighborhood geohash.",
    badge: "< 15MS LOOKUP",
  },
  {
    layer: "05. LANGUAGE & HEALTH",
    service: "Amazon Bedrock",
    color: "#d0ee91",
    desc: "Generates plain-language neighborhood advisories and action tips for cyclists, schools, and vulnerable groups using Bedrock with an atmospheric knowledge base.",
    badge: "BEDROCK AI",
  },
  {
    layer: "06. CITIZEN ALERTS",
    service: "Amazon SNS",
    color: "#f49a6b",
    desc: "Publishes localized threshold crossing alerts (AQI ≥ 150, 200, 300) directly to subscriber emails and SMS topics when model predicts severe smog spikes.",
    badge: "SNS TOPICS",
  },
];

export default function AwsArchitectureModal({
  isOpen,
  onClose,
}: AwsArchitectureModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="arch-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-ivory/20 bg-[#0a1814]/95 p-6 md:p-10 text-ivory shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CornerTicks />

        {/* Top bar */}
        <div className="flex items-start justify-between border-b border-ivory/15 pb-5">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-lime">
              <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
              AWS CLOUD ARCHITECTURE · WE-MAKE-DEVS × AWS HACKATHON
            </p>
            <h2 id="arch-title" className="f-display mt-2 text-2xl md:text-3xl text-ivory">
              MSR: Satellite Smog Forecast Pipeline
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-ivory/20 px-3 py-1 font-mono text-xs text-ivory/60 hover:border-lime hover:text-lime transition-colors"
            aria-label="Close modal"
          >
            ESC ✕
          </button>
        </div>

        {/* Overview banner */}
        <div className="my-6 border border-lime/30 bg-lime/[0.05] p-4 font-mono text-xs leading-relaxed text-ivory/80">
          <span className="text-lime font-bold">PROJECT CONCEPT:</span>{" "}
          Fusing satellite aerosol observations (Sentinel-5P TROPOMI & NASA VIIRS) with ERA-5 weather and CPCB ground stations on AWS to provide 48-hour neighborhood-level (~3 km) forecasts for Delhi NCR.
        </div>

        {/* Grid of AWS services */}
        <div className="grid gap-4 md:grid-cols-2">
          {AWS_LAYERS.map((item) => (
            <div
              key={item.layer}
              className="border border-ivory/15 bg-ink/60 p-4 transition-colors hover:border-ivory/30"
            >
              <div className="flex items-center justify-between font-mono text-[9.5px]">
                <span className="tracking-[0.25em] text-ivory/40">{item.layer}</span>
                <span
                  className="border px-2 py-0.5 tracking-[0.15em]"
                  style={{ borderColor: `${item.color}55`, color: item.color }}
                >
                  {item.badge}
                </span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-ivory">
                {item.service}
              </h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ivory/65">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Team and Hosting footer */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-ivory/15 pt-5 font-mono text-[10px] tracking-[0.18em] text-ivory/50">
          <div>
            TEAM CALYPSO: <span className="text-lime">Saket, Ritvik, Mahek</span>
          </div>
          <div>
            HOSTED ON: <span className="text-ember">AWS Amplify Hosting</span>
          </div>
        </div>
      </div>
    </div>
  );
}
