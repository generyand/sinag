'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatedSulopMap } from './AnimatedSulopMap';
import { MapPin } from 'lucide-react';

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
        rootMargin: '0px 0px -50px 0px',
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
      className={`w-full max-w-5xl mx-auto px-8 py-16 pb-24 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      aria-labelledby="map-heading"
    >
      {/* Section Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A3A6D]/10 rounded-full mb-4">
          <MapPin className="w-4 h-4 text-[#1A3A6D]" />
          <span className="text-sm font-semibold text-[#1A3A6D]">
            Geographic Coverage
          </span>
        </div>
        <h2
          id="map-heading"
          className="text-3xl md:text-4xl lg:text-4xl font-extrabold text-black mb-4"
        >
          Sulop&apos;s 25 Barangays
        </h2>
        <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto font-normal">
          SINAG covers all barangays in the Municipality of Sulop, Davao del Sur,
          ensuring comprehensive governance assessment across the entire municipality.
        </p>
      </div>

      {/* Map with constrained size */}
      <div className="flex justify-center">
        <div className="w-full max-w-3xl">
          <AnimatedSulopMap className="max-h-[350px]" />
        </div>
      </div>
    </section>
  );
}
