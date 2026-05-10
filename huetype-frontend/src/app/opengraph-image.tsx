import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Hue Type — Multi-colour icon font builder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0f0f0f",
          color: "#eeeeee",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            color: "#888",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#7c6af5",
            }}
          />
          Hue Type
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 92, fontWeight: 600, lineHeight: 1.05 }}>
            Your icons,
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 600,
              lineHeight: 1.05,
              background: "linear-gradient(90deg, #7c6af5, #ff6b9d, #ffb347)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            shipped as a font.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 24,
            color: "#888",
          }}
        >
          <div style={{ maxWidth: 720 }}>
            Build OpenType colour fonts from SVG. WOFF2 + TTF.
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {["#FFD93D", "#E74C3C", "#F39C12", "#27AE60"].map((c) => (
              <div
                key={c}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  background: c,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
