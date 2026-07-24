import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const socialImageSize = {
  width: 1200,
  height: 630,
};

export async function createSocialCard() {
  const logoBuffer = await readFile(
    join(process.cwd(), "public", "pro-team-logo.png"),
  );
  const logo = logoBuffer.buffer.slice(
    logoBuffer.byteOffset,
    logoBuffer.byteOffset + logoBuffer.byteLength,
  );

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at 16% 12%, #40285f 0%, transparent 32%), radial-gradient(circle at 88% 82%, #4a1c38 0%, transparent 30%), linear-gradient(135deg, #090a0f 0%, #15111e 54%, #0b0c12 100%)",
          color: "#ffffff",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "74px 82px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: "column",
            maxWidth: 660,
          }}
        >
          <div
            style={{
              color: "#ff9c63",
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 4,
              marginBottom: 28,
              textTransform: "uppercase",
            }}
          >
            TASK MANAGEMENT
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1,
            }}
          >
            Pro Team
          </div>
          <div
            style={{
              color: "#d7d5df",
              display: "flex",
              fontSize: 32,
              lineHeight: 1.35,
              marginTop: 28,
            }}
          >
            One team. One rhythm.
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            background: "transparent",
            display: "flex",
            height: 360,
            justifyContent: "center",
            overflow: "hidden",
            width: 360,
          }}
        >
          <img
            alt=""
            src={logo as unknown as string}
            style={{
              height: 530,
              objectFit: "contain",
              width: 612,
            }}
          />
        </div>
      </div>
    ),
    socialImageSize,
  );
}
