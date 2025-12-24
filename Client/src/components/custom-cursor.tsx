"use client";

import { useEffect, useState } from "react";

export const CustomCursor = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      const target = e.target as HTMLElement;
      const isClickable = 
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.tagName === "INPUT" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']") ||
        target.closest("[data-clickable]");
      
      setIsPointer(!!isClickable);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", updateCursor);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", updateCursor);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, []);

  return (
    <div
      className="fixed pointer-events-none z-[99999] mix-blend-difference"
      style={{
        left: position.x,
        top: position.y,
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.15s ease",
      }}
    >
      {/* Outer ring */}
      <div
        className="absolute rounded-full border border-white"
        style={{
          width: isPointer ? 40 : 32,
          height: isPointer ? 40 : 32,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.85 : 1})`,
          transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: 0.5,
        }}
      />
      {/* Inner dot */}
      <div
        className="absolute bg-white rounded-full"
        style={{
          width: 4,
          height: 4,
          transform: `translate(-50%, -50%) scale(${isClicking ? 2 : 1})`,
          transition: "transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
};
