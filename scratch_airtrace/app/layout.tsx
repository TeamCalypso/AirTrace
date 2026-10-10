import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plexmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Airtrace — From Orbit to Your Street",
    template: "%s — Airtrace",
  },
  description:
    "A cinematic, scroll-driven explainer of how an air-quality forecast travels from satellite observation over South Asia to your neighborhood — with an illustrative 48-hour Delhi–NCR outlook.",
  openGraph: {
    title: "Airtrace — From Orbit to Your Street",
    description:
      "A 60-second descent through the machinery of an air-quality forecast: satellite swath, burn season, wind transport, the inversion lid — and a 48-hour neighborhood outlook. Illustrative demo, not live data.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  themeColor: "#091310",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${grotesk.variable} ${plexMono.variable}`}
    >
      <body className="bg-ink text-ivory">
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
