import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
