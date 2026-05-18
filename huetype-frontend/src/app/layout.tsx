import type { Metadata, Viewport } from "next";
import { Albert_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import SafariFontInit from "@/components/safari-font-init";
import SafariBanner from "@/components/safari-banner";

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
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-KEQ427CMWZ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-KEQ427CMWZ');
          `}
        </Script>
      </head>
      <body>
        <SafariFontInit />
        <SafariBanner />
        {children}
      </body>
    </html>
  );
}
