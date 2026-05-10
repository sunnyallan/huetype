import type { Metadata } from "next";
import LandingClient from "./landing-client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sunnyallan.design";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Hue Type — Build colour fonts from SVG icons",
  description:
    "Turn your SVG icons into a real OpenType colour font with COLR/CPAL v1. Drop SVGs, click build, get a WOFF2 + TTF. Recolour live with CSS font-palette.",
  keywords: [
    "colour font",
    "color font",
    "icon font",
    "COLR",
    "CPAL",
    "OpenType",
    "SVG to font",
    "WOFF2",
    "nanoemoji",
    "font-palette",
    "icon font builder",
    "design system fonts",
  ],
  authors: [{ name: "Sunny Allan" }],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Hue Type",
    title: "Hue Type — Build colour fonts from SVG icons",
    description:
      "Drop SVGs, click build, get a real OpenType colour font. Recolour live with CSS.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hue Type — Build colour fonts from SVG icons",
    description:
      "Drop SVGs, click build, get a real OpenType colour font. Recolour live with CSS.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Hue Type",
  description:
    "Multi-colour icon font builder. Convert SVG icons into OpenType colour fonts (COLR/CPAL v1) with WOFF2 and TTF output.",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Drag and drop SVG upload",
    "OpenType COLR/CPAL v1 colour fonts",
    "WOFF2 and TTF export",
    "Live palette editing with CSS font-palette",
    "Cross-browser and Figma compatible",
  ],
  creator: {
    "@type": "Person",
    name: "Sunny Allan",
  },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient />
    </>
  );
}
