import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#090d12",
          color: "#f5f0e8",
          padding: "64px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#8fb7d6",
          }}
        >
          <span>{SITE_NAME}</span>
          <span>Airport Context</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 112,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 0.95,
            }}
          >
            METAR. Traffic. Map.
          </div>
          <div
            style={{
              width: 760,
              fontSize: 34,
              lineHeight: 1.3,
              color: "#b9c2cc",
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 18,
            fontSize: 24,
            color: "#f5f0e8",
          }}
        >
          <span>KBOS</span>
          <span>KLAX</span>
          <span>KJFK</span>
          <span>KORD</span>
          <span>KSFO</span>
          <span>KSEA</span>
        </div>
      </div>
    ),
    size,
  );
}
