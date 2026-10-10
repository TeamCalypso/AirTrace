import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ATMOS/48 — How your air quality forecast is made",
  description:
    "A cinematic scroll journey from a Sentinel-5P swath over India, down to VIIRS fire detections in Punjab, along 3D wind vectors into Delhi, under a temperature inversion — and finally to your own 48-hour neighbourhood forecast.",
  keywords: [
    "air quality forecast",
    "PM2.5",
    "Delhi air pollution",
    "stubble burning",
    "Sentinel-5P",
    "VIIRS",
    "stubble smoke forecast",
  ],
  openGraph: {
    title: "ATMOS/48 — one breath of smoke, traced from orbit",
    description:
      "Follow one plume from a Punjab rice field to a Delhi bedroom, through four satellite data pipelines, and get your own 48-hour forecast.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "ATMOS/48", description: "One breath of smoke, traced from orbit." },
};

export const viewport: Viewport = {
  themeColor: "#03060d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <body className="bg-[#03060d] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
