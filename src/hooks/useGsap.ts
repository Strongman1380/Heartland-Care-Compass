
import { useEffect, useRef } from "react";
import gsap from "gsap";

export const useGsapReveal = (options: { 
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  stagger?: number;
} = {}) => {
  const { 
    direction = "up", 
    delay = 0, 
    duration = 0.8, 
    stagger = 0.1 
  } = options;
  
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const elements = elementRef.current.querySelectorAll(".gsap-reveal");
    
    let x = 0;
    let y = 0;
    
    if (direction === "up") y = 30;
    if (direction === "down") y = -30;
    if (direction === "left") x = 30;
    if (direction === "right") x = -30;

    gsap.set(elements, { 
      opacity: 0, 
      x, 
      y, 
      visibility: "hidden" 
    });

    gsap.to(elements, {
      opacity: 1,
      x: 0,
      y: 0,
      visibility: "visible",
      duration,
      delay,
      stagger,
      ease: "power3.out",
    });
  }, [direction, delay, duration, stagger]);

  return elementRef;
};
