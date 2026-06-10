"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

// liquid-glass-react reads navigator/window at module scope — client only.
const LiquidGlass = dynamic(() => import("liquid-glass-react"), {
  ssr: false,
});

/**
 * In-flow wrapper for rdev/liquid-glass-react (Apple Liquid Glass).
 *
 * The library positions all of its layers absolutely at top:50%/left:50%
 * with translate(-50%, -50%) — built for centered overlays, not for
 * normal document flow. GlassShell measures the rendered glass pill via
 * ResizeObserver and sizes a relative wrapper to match, so the glass can
 * sit inside toolbars, menus, and flex rows like any other element.
 *
 * Until the client bundle mounts (and during SSR) children render inside
 * a plain CSS frosted-glass fallback with identical geometry, so there is
 * no flash or layout jump.
 */
export default function GlassShell({
  children,
  cornerRadius = 999,
  displacementScale = 40,
  blurAmount = 0.08,
  saturation = 130,
  aberrationIntensity = 1.5,
  elasticity = 0.1,
  overLight = false,
  padding = "0px",
  className = "",
  style,
}: {
  children: ReactNode;
  cornerRadius?: number;
  displacementScale?: number;
  blurAmount?: number;
  saturation?: number;
  aberrationIntensity?: number;
  elasticity?: number;
  overLight?: boolean;
  padding?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => setMounted(true), []);

  // Measure the glass pill (the lib's .glass element shrink-wraps the
  // children) and size the wrapper to match so flow layout stays intact.
  useEffect(() => {
    if (!mounted) return undefined;
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    let observer: ResizeObserver | null = null;
    let raf = 0;

    const attach = () => {
      const glassEl = wrapper.querySelector(".glass");
      if (!glassEl) {
        raf = requestAnimationFrame(attach);
        return;
      }
      const update = () => {
        const rect = glassEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSize((current) =>
            current?.w === rect.width && current?.h === rect.height
              ? current
              : { w: rect.width, h: rect.height },
          );
        }
      };
      update();
      observer = new ResizeObserver(update);
      observer.observe(glassEl);
    };

    attach();
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div
        className={className}
        style={{
          borderRadius: cornerRadius,
          background: "var(--glass-bg-strong)",
          backdropFilter: "blur(20px) saturate(1.2)",
          WebkitBackdropFilter: "blur(20px) saturate(1.2)",
          border: "1px solid var(--glass-border)",
          padding,
          width: "fit-content",
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        position: "relative",
        width: size ? size.w : undefined,
        height: size ? size.h : undefined,
        minWidth: size ? undefined : "fit-content",
        ...style,
      }}
    >
      <LiquidGlass
        cornerRadius={cornerRadius}
        displacementScale={displacementScale}
        blurAmount={blurAmount}
        saturation={saturation}
        aberrationIntensity={aberrationIntensity}
        elasticity={elasticity}
        overLight={overLight}
        padding={padding}
        style={{ position: "absolute", top: "50%", left: "50%" }}
      >
        {children}
      </LiquidGlass>
    </div>
  );
}
