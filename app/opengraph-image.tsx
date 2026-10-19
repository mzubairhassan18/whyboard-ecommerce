import { ImageResponse } from "next/og";

export const alt = "Whyboard — why your revenue moved";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07090d",
          padding: "72px 80px",
          color: "#eff3fa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 34 }}>
            <div style={{ width: 9, height: 14, background: "#7fb2ff", opacity: 0.45, borderRadius: 2 }} />
            <div style={{ width: 9, height: 23, background: "#7fb2ff", opacity: 0.72, borderRadius: 2 }} />
            <div style={{ width: 9, height: 34, background: "#7fb2ff", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 30, letterSpacing: -0.5 }}>whyboard</div>
          <div
            style={{
              marginLeft: 8,
              fontSize: 16,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#8a94a6",
              border: "1px solid #1f2735",
              borderRadius: 999,
              padding: "6px 14px",
            }}
          >
            ecommerce
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 72, lineHeight: 1.03, letterSpacing: -3, maxWidth: 940 }}>
            Your revenue dropped. Here&apos;s the actual reason.
          </div>
          <div style={{ fontSize: 28, color: "#8a94a6", maxWidth: 840, lineHeight: 1.4 }}>
            An AI detective for your store. Orders CSV in, evidence-backed story out —
            with every query attached.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 20, color: "#5b6474" }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: "#7fb2ff" }} />
          read-only by design · never stores your file
        </div>
      </div>
    ),
    size,
  );
}
