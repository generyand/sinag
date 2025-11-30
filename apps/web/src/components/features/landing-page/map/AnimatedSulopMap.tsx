'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BARANGAY_PATHS } from '@/components/features/analytics/sulop-barangay-paths';

/**
 * Design system colors for the animated map
 * Using SINAG brand colors - red, yellow, and DILG blue
 */
const ANIMATION_COLORS = [
  '#dc2626', // Red (primary)
  '#fbbf24', // Yellow/Amber
  '#1A3A6D', // DILG Blue (dark)
] as const;

/**
 * Mapping from SVG IDs to display names
 */
const BARANGAY_NAMES: Record<string, string> = {
  '1katipunan': 'Katipunan',
  '2tanwalang': 'Tanwalang',
  '3solongvale': 'Solong Vale',
  '4tala-o': 'Tala-o',
  '5balasinon': 'Balasinon',
  '6haradabutai': 'Harada-Butai',
  '7roxas': 'Roxas',
  '8newcebu': 'New Cebu',
  '9palili': 'Palili',
  '10talas': 'Talas',
  '11carre': 'Carre',
  '12buguis': 'Buguis',
  '13mckinley': 'McKinley',
  '14kiblagon': 'Kiblagon',
  '15laperas': 'Laperas',
  '16clib': 'Clib',
  '17osmena': 'Osmeña',
  '18luparan': 'Luparan',
  '19poblacion': 'Poblacion',
  '20tagolilong': 'Tagolilong',
  '21lapla': 'Lapla',
  '22litos': 'Litos',
  '23parame': 'Parame',
  '24labon': 'Labon',
  '25waterfall': 'Waterfall',
};

// Get all barangay IDs in order
const BARANGAY_IDS = Object.keys(BARANGAY_PATHS);

interface AnimatedSulopMapProps {
  className?: string;
}

/**
 * Animated Sulop Map for Landing Page
 *
 * Features a wave animation effect with design system colors
 * purely decorative - not showing actual assessment data
 */
export function AnimatedSulopMap({ className = '' }: AnimatedSulopMapProps) {
  const [colorIndices, setColorIndices] = useState<number[]>(
    BARANGAY_IDS.map((_, i) => i % ANIMATION_COLORS.length)
  );
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredBarangay, setHoveredBarangay] = useState<string | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection observer for scroll animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    const currentElement = containerRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, []);

  // Wave animation - colors shift across barangays
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setColorIndices((prev) =>
        prev.map((idx) => (idx + 1) % ANIMATION_COLORS.length)
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Get color for a barangay with staggered offset for wave effect
  const getBarangayColor = (index: number, svgId: string): string => {
    // If this barangay is hovered, return its locked color
    if (hoveredBarangay === svgId && hoveredColor) {
      return hoveredColor;
    }
    const staggeredIndex = (colorIndices[index] + Math.floor(index / 3)) % ANIMATION_COLORS.length;
    return ANIMATION_COLORS[staggeredIndex];
  };

  // Handle mouse enter - lock the current color
  const handleMouseEnter = (svgId: string, index: number) => {
    const staggeredIndex = (colorIndices[index] + Math.floor(index / 3)) % ANIMATION_COLORS.length;
    setHoveredColor(ANIMATION_COLORS[staggeredIndex]);
    setHoveredBarangay(svgId);
  };

  // Handle mouse leave - unlock the color
  const handleMouseLeave = () => {
    setHoveredBarangay(null);
    setHoveredColor(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
    >
      <svg
        viewBox="0 0 1920 892"
        className={`w-full h-full transition-all duration-1000 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Animated map of Sulop barangays"
      >
        {/* Background */}
        <rect width="1920" height="892" className="fill-transparent" />

        {/* Barangay Paths with animated colors */}
        {Object.entries(BARANGAY_PATHS).map(([svgId, pathData], index) => (
          <path
            key={svgId}
            id={svgId}
            d={pathData}
            fill={getBarangayColor(index, svgId)}
            stroke={hoveredBarangay === svgId ? '#ffffff' : 'white'}
            strokeWidth={hoveredBarangay === svgId ? 3 : 2}
            className={`cursor-pointer ${
              hoveredBarangay === svgId
                ? 'transition-none'
                : 'transition-all duration-1000 ease-in-out'
            }`}
            style={{
              transitionDelay: hoveredBarangay === svgId ? '0ms' : `${index * 50}ms`,
              opacity: hoveredBarangay === svgId ? 1 : 0.85,
              filter: hoveredBarangay === svgId ? 'brightness(1.1)' : 'none',
            }}
            onMouseEnter={() => handleMouseEnter(svgId, index)}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </svg>

      {/* Tooltip for hovered barangay */}
      {hoveredBarangay && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm shadow-lg rounded-lg px-4 py-2 pointer-events-none z-10 border border-gray-200"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: hoveredColor || '#1A3A6D' }}
            />
            <span className="text-sm font-semibold text-gray-900">
              {BARANGAY_NAMES[hoveredBarangay] || hoveredBarangay}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
