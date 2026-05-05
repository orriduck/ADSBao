"use client";

import dynamic from "next/dynamic";

const Dither = dynamic(() => import("../effects/Dither.jsx"), {
  ssr: false,
});

export default function DitherBackground() {
  return (
    <div className="dither-background absolute inset-0 overflow-hidden">
      <Dither
        waveColor={[
          0.6431372549019608, 0.7019607843137254, 0.792156862745098,
        ]}
        colorNum={15}
        waveAmplitude={0.22}
        waveSpeed={0.1}
        waveFrequency={0.6}
        mouseRadius={0.8}
        disableAnimation={false}
        enableMouseInteraction={false}
      />
    </div>
  );
}
