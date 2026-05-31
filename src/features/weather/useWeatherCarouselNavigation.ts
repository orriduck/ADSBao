"use client";

import { useEffect, useRef, useState } from "react";

export function useWeatherCarouselNavigation(slides) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);
  const activeSlide = slides[activeIndex] || slides[0];

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(Math.max(current, 0), Math.max(slides.length - 1, 0)),
    );
  }, [slides.length]);

  const scrollToSlide = (index) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * index, behavior: "smooth" });
    setActiveIndex(index);
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const nextIndex = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    setActiveIndex(Math.min(Math.max(nextIndex, 0), slides.length - 1));
  };

  return {
    activeIndex,
    activeSlide,
    trackRef,
    scrollToSlide,
    handleScroll,
  };
}
