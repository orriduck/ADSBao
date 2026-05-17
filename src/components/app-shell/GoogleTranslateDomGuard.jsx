"use client";

import { useEffect } from "react";
import { isGoogleTranslateDomNotFoundError } from "@/utils/googleTranslateDomGuard.js";

export default function GoogleTranslateDomGuard() {
  useEffect(() => {
    if (typeof Node === "undefined") return undefined;
    const prototype = Node.prototype;
    if (prototype.__adsbaoGoogleTranslateGuard) return undefined;

    const originalRemoveChild = prototype.removeChild;
    const originalInsertBefore = prototype.insertBefore;

    Object.defineProperty(prototype, "__adsbaoGoogleTranslateGuard", {
      value: true,
      configurable: true,
    });

    prototype.removeChild = function guardedRemoveChild(child) {
      try {
        return originalRemoveChild.call(this, child);
      } catch (error) {
        if (isGoogleTranslateDomNotFoundError(error)) return child;
        throw error;
      }
    };

    prototype.insertBefore = function guardedInsertBefore(newNode, referenceNode) {
      try {
        return originalInsertBefore.call(this, newNode, referenceNode);
      } catch (error) {
        if (isGoogleTranslateDomNotFoundError(error)) {
          return originalInsertBefore.call(this, newNode, null);
        }
        throw error;
      }
    };

    return undefined;
  }, []);

  return null;
}
