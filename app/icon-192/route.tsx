import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#002642",
          color: "#FF9900",
          fontSize: 112,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        A
      </div>
    ),
    { width: 192, height: 192 },
  );
}
