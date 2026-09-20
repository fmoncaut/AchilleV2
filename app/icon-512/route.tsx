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
          fontSize: 300,
          fontWeight: 700,
          letterSpacing: -8,
        }}
      >
        A
      </div>
    ),
    { width: 512, height: 512 },
  );
}
