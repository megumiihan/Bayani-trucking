"use client";

import { useEffect } from "react";

export function useEscapeToClose(
  isOpen: boolean,
  onClose: () => void,
  disabled = false
) {
  useEffect(() => {
    if (!isOpen || disabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, disabled]);
}
