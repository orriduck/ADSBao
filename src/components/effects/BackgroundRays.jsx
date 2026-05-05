"use client";

import dynamic from "next/dynamic";

const LightRays = dynamic(() => import("./LightRays.jsx"), { ssr: false });

export default function BackgroundRays() {
  return (
    <div className="background-rays" aria-hidden="true">
      <LightRays
        raysOrigin="top-center"
        raysColor="#8FB7D6"
        raysSpeed={0.9}
        lightSpread={0.85}
        rayLength={1.4}
        followMouse
        mouseInfluence={0.08}
        noiseAmount={0.06}
        distortion={0.04}
        saturation={0.9}
        pulsating={true}
      />
    </div>
  );
}
