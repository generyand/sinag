"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatedSulopMap } from "./AnimatedSulopMap";
import { MapPin } from "lucide-react";

// Custom hook for scroll animations
function useScrollAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, []);

  return { elementRef, isVisible };
}

export function MapSection() {
  const { elementRef, isVisible } = useScrollAnimation();

  return (
    <section
      ref={elementRef}
      className={`w-full max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16 pb-16 md:pb-24 transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      aria-labelledby="map-heading"
    >
      {/* Section Header */}
      <div className="text-center mb-6 md:mb-8">
        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-[#1A3A6D]/10 rounded-full mb-3 md:mb-4">
          <MapPin className="w-4 h-4 text-[#1A3A6D]" />
          <span className="text-xs md:text-sm font-semibold text-[#1A3A6D]">
            Geographic Coverage
          </span>
        </div>
        <h2
          id="map-heading"
          className="text-2xl md:text-4xl lg:text-4xl font-extrabold text-black mb-3 md:mb-4 px-4"
        >
          Sulop&apos;s 25 Barangays
        </h2>
        <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto font-normal px-4">
          SINAG covers all barangays in the Municipality of Sulop, Davao del Sur, ensuring
          comprehensive governance assessment across the entire municipality.
        </p>
      </div>

      {/* Map with constrained size */}
      <div className="flex justify-center">
        <div className="w-full max-w-3xl px-2 md:px-0">
          <AnimatedSulopMap className="max-h-[280px] md:max-h-[350px]" />
        </div>
      </div>
    </section>
  );
}
