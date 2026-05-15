import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Legacy dark theme (landing page) ──────────────────────────────
        bg: {
          DEFAULT: "#0f0f0f",
          card: "#1a1a1a",
          hover: "#222222",
        },
        border: {
          DEFAULT: "#2a2a2a",
          strong: "#3a3a3a",
        },
        accent: {
          DEFAULT: "#7c6af5",
          hover: "#8d7df7",
        },
        text: {
          primary: "#eeeeee",
          secondary: "#888888",
          muted: "#555555",
          dim: "#444444",
        },

        // ── New post-login theme (from Figma) ─────────────────────────────
        ht: {
          bg: "#f3f3f3",       // page background
          surface: "#e9eeea",  // card surface
          inner: "#f7f8f8",    // inner well (icon container)
          ink: "#17181c",      // CTA / strong text
          line: "#444648",     // active-state border
          lime: "#eefa94",     // accent chip
          white: "#ffffff",
        },
      },
      fontFamily: {
        // Default sans = Albert Sans across the app
        sans: ["var(--font-albert)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      borderRadius: {
        "ht-sm": "5px",
        "ht-md": "20px",
        "ht-lg": "24px",
        "ht-xl": "32px",
      },
      boxShadow: {
        "ht-soft": "0px 4px 20px rgba(0,0,0,0.03)",
        "ht-card": "0px 4px 20px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
