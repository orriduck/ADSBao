import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_SOCIAL_IMAGE } from "@/config/site";

const FONT_URLS = [
  {
    name: "Manrope",
    weight: 500,
    url: "https://fonts.gstatic.com/s/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk7PFO_F.ttf",
  },
  {
    name: "Manrope",
    weight: 700,
    url: "https://fonts.gstatic.com/s/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk4aE-_F.ttf",
  },
  {
    name: "Manrope",
    weight: 800,
    url: "https://fonts.gstatic.com/s/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk59E-_F.ttf",
  },
  {
    name: "Noto Sans SC",
    weight: 700,
    url: "https://fonts.gstatic.com/s/notosanssc/v40/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaGzjCnYw.ttf",
  },
];

const imageSize = {
  width: SITE_SOCIAL_IMAGE.width,
  height: SITE_SOCIAL_IMAGE.height,
};

const fontFamily = '"Manrope", "Noto Sans SC", sans-serif';

const colors = {
  paper: "#f1f1ef",
  ink: "#181714",
  markCutout: "#f1f1ef",
};

const backgroundCircles = [
  { x: -104, y: -112, size: 244, color: "#d6d6d2" },
  { x: 120, y: -112, size: 244, color: "#b9b9b5" },
  { x: 344, y: -112, size: 244, color: "#e4e4e1" },
  { x: 568, y: -112, size: 244, color: "#c7c7c3" },
  { x: 792, y: -112, size: 244, color: "#ececea" },
  { x: 1016, y: -112, size: 244, color: "#b2b2ae" },
  { x: -104, y: 112, size: 244, color: "#bfbfbb" },
  { x: 120, y: 112, size: 244, color: "#e8e8e5" },
  { x: 344, y: 112, size: 244, color: "#d0d0cc" },
  { x: 568, y: 112, size: 244, color: "#adada9" },
  { x: 792, y: 112, size: 244, color: "#ddddda" },
  { x: 1016, y: 112, size: 244, color: "#c4c4c0" },
  { x: -104, y: 336, size: 244, color: "#ebebe8" },
  { x: 120, y: 336, size: 244, color: "#c8c8c4" },
  { x: 344, y: 336, size: 244, color: "#aaaaa6" },
  { x: 568, y: 336, size: 244, color: "#e1e1de" },
  { x: 792, y: 336, size: 244, color: "#bebeba" },
  { x: 1016, y: 336, size: 244, color: "#eeeeec" },
  { x: -104, y: 560, size: 244, color: "#ccccc8" },
  { x: 120, y: 560, size: 244, color: "#b5b5b1" },
  { x: 344, y: 560, size: 244, color: "#e6e6e3" },
  { x: 568, y: 560, size: 244, color: "#c1c1bd" },
  { x: 792, y: 560, size: 244, color: "#d9d9d5" },
  { x: 1016, y: 560, size: 244, color: "#a8a8a4" },
];

const fontData = Promise.all(
  FONT_URLS.map(async ({ name, weight, url }) => {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Failed to load ${name} ${weight} font`);
    }

    return {
      name,
      data: await response.arrayBuffer(),
      weight,
      style: "normal",
    };
  }),
);

function BrandMark({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 76 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="38" cy="38" r="34" fill={colors.ink} />
      <path
        d="M29 19L57 38L29 57V44H14V32H29V19Z"
        fill={colors.markCutout}
      />
    </svg>
  );
}

function BackgroundCircle({ x, y, size, color }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
      }}
    />
  );
}

function CircleBackground() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: imageSize.width,
        height: imageSize.height,
        display: "flex",
        overflow: "hidden",
        background: colors.paper,
      }}
    >
      {backgroundCircles.map((circle) => (
        <BackgroundCircle
          key={`${circle.x}-${circle.y}-${circle.size}`}
          {...circle}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: imageSize.width,
          height: imageSize.height,
          display: "flex",
          background:
            "linear-gradient(135deg, rgba(241, 241, 239, 0) 0%, rgba(241, 241, 239, 0.42) 34%, rgba(241, 241, 239, 0.84) 66%, rgba(241, 241, 239, 0.96) 100%)",
        }}
      />
    </div>
  );
}

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          overflow: "hidden",
          background: colors.paper,
          color: colors.ink,
          fontFamily,
        }}
      >
        <CircleBackground />

        <div
          style={{
            position: "absolute",
            left: 64,
            top: 54,
            width: 1072,
            height: 522,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
            }}
          >
            <BrandMark size={76} />
            <div
              style={{
                display: "flex",
                color: colors.ink,
                fontSize: 126,
                fontWeight: 800,
                letterSpacing: "normal",
                lineHeight: 0.92,
              }}
            >
              {SITE_NAME}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 34,
              paddingLeft: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                color: colors.ink,
                fontSize: 50,
                fontWeight: 800,
                letterSpacing: "normal",
                lineHeight: 1,
              }}
            >
              Airport context, at a glance.
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...imageSize,
      fonts: (await fontData) as any,
    },
  );
}
