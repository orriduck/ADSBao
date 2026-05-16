"use client";

import { useEffect } from "react";

export function useDismissibleDrawer({ open, containerRef, onClose }) {
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!open || containerRef.current?.contains(event.target)) return;
      onClose();
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [containerRef, onClose, open]);
}
