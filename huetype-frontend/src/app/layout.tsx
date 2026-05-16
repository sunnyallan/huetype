import type { Metadata, Viewport } from "next";
import { Albert_Sans } from "next/font/google";
import "./globals.css";
import SafariFontInit from "@/components/safari-font-init";

const albertSans = Albert_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-albert",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.sunnyallan.design";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Hue Type — Multi-colour icon font builder",
    template: "%s · Hue Type",
  },
  description:
    "Turn SVG icons into OpenType colour fonts (COLR/CPAL v1). Drop, build, ship.",
  applicationName: "Hue Type",
  creator: "Sunny Allan",
  publisher: "Hue Type",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
    { media: "(prefers-color-scheme: light)", color: "#0f0f0f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={albertSans.variable}>
      <body>
        <SafariFontInit />
        {children}
      </body>
    </html>
  );
}
