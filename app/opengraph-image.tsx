import { ImageResponse } from "next/og";

export const alt = "Akwire — Think global, shop local";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#13263F",
          gap: 28,
        }}
      >
        <svg
          width="120"
          height="150"
          viewBox="0 0 64 80"
          style={{ display: "flex" }}
        >
          <path
            d="M32 5C18.75 5 8 15.52 8 28.5c0 15.5 18.6 39.1 21.9 43.2a2.7 2.7 0 0 0 4.2 0C37.4 67.6 56 44 56 28.5 56 15.52 45.25 5 32 5Z"
            fill="#F6F5F1"
          />
          <circle cx="32" cy="28" r="10.5" fill="#F7A325" />
        </svg>
        <div
          style={{
            color: "#F6F5F1",
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            textTransform: "lowercase",
          }}
        >
          akwire
        </div>
      </div>
    ),
    size,
  );
}
