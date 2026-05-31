/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import {
  isAirlineLogoUnavailable,
  markAirlineLogoUnavailable,
} from "@/features/aviation/airlineLogoModel";

export default function AirlineLogo({ src, className }) {
  const [hidden, setHidden] = useState(() => !src || isAirlineLogoUnavailable(src));

  useEffect(() => {
    setHidden(!src || isAirlineLogoUnavailable(src));
  }, [src]);

  if (!src || hidden) return null;

  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        markAirlineLogoUnavailable(src);
        setHidden(true);
      }}
    />
  );
}
