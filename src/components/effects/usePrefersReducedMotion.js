"use client";

import { useSyncExternalStore } from "react";

let mediaQuery = null;
const subscribers = new Set();

function getMediaQuery() {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  if (!mediaQuery) {
    mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  }
  return mediaQuery;
}

function notifySubscribers() {
  subscribers.forEach((callback) => callback());
}

export function prefersReducedMotion() {
  return getMediaQuery()?.matches || false;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );
}

function subscribeReducedMotion(callback) {
  const query = getMediaQuery();
  if (!query) return () => {};

  subscribers.add(callback);
  if (subscribers.size === 1) {
    query.addEventListener("change", notifySubscribers);
  }

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      query.removeEventListener("change", notifySubscribers);
    }
  };
}
