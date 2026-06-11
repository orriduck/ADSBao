"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const ERASE_MS = 140;
const HOLD_MS = 100;
const REVEAL_MS = 220;
const SETTLE_MS = 30;

export function useContentSwap({
  identityKey,
  value,
  delaySeconds = 0,
  disabled = false,
}) {
  const reducedMotion = usePrefersReducedMotion();
  const liveValueRef = useRef(value);
  const previousValueRef = useRef(value);
  const lastKeyRef = useRef(identityKey);
  const phaseRef = useRef("idle");
  const timersRef = useRef([]);
  const [displayedValue, setDisplayedValue] = useState(value);
  const [phase, setPhaseState] = useState("idle");
  const [replaceDelay, setReplaceDelay] = useState(0);
  liveValueRef.current = value;

  const setPhase = (nextPhase) => {
    phaseRef.current = nextPhase;
    setPhaseState(nextPhase);
  };

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    if (phaseRef.current === "idle") {
      previousValueRef.current = value;
      setDisplayedValue(value);
    }
  }, [identityKey, value]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useLayoutEffect(() => {
    if (identityKey === lastKeyRef.current) return undefined;
    const previousValue = previousValueRef.current;
    lastKeyRef.current = identityKey;
    clearTimers();

    if (disabled || reducedMotion) {
      const nextValue = liveValueRef.current;
      setDisplayedValue(nextValue);
      previousValueRef.current = nextValue;
      setReplaceDelay(0);
      setPhase("idle");
      return undefined;
    }

    const delayMs = Math.max(delaySeconds, 0) * 1000;
    setDisplayedValue(previousValue);
    setReplaceDelay(Math.max(delaySeconds, 0));
    setPhase("erasing");

    timersRef.current = [
      window.setTimeout(() => {
        setDisplayedValue(liveValueRef.current);
        setPhase("hidden");
      }, delayMs + ERASE_MS),
      window.setTimeout(() => {
        setPhase("revealing");
      }, delayMs + ERASE_MS + HOLD_MS),
      window.setTimeout(() => {
        const nextValue = liveValueRef.current;
        previousValueRef.current = nextValue;
        setDisplayedValue(nextValue);
        setPhase("idle");
      }, delayMs + ERASE_MS + HOLD_MS + REVEAL_MS + SETTLE_MS),
    ];

    return clearTimers;
  }, [identityKey, delaySeconds, disabled, reducedMotion, clearTimers]);

  const contentPhaseClass =
    phase === "erasing"
      ? "content-swap__content--erasing"
      : phase === "hidden"
        ? "content-swap__content--hidden"
        : phase === "revealing"
          ? "content-swap__content--revealing"
          : "";

  return {
    displayedValue,
    replacing: phase !== "idle",
    contentPhaseClass,
    style: { "--content-swap-delay": `${replaceDelay}s` },
  };
}
