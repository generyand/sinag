"use client";

import { useEffect, useRef, useState } from "react";

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

import { useGetLookupsBarangays } from "@vantage/shared";

export function BarangaysSection() {
  const barangaysAnimation = useScrollAnimation();
  const { data: barangays } = useGetLookupsBarangays();

  return (
    <section
      ref={barangaysAnimation.elementRef}
      className={`relative w-full bg-gradient-to-br from-gray-900 via-black to-gray-800 py-16 px-8 transition-all duration-1000 overflow-hidden ${
        barangaysAnimation.isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      }`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 border border-[#fbbf24] rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 border border-[#f59e0b] rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 border border-[#d97706] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto px-8 text-center relative z-10">
        {/* Section Header */}
        <div
          className={`mb-16 transition-all duration-1000 ${
            barangaysAnimation.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <h2
            className={`text-4xl md:text-5xl font-bold text-white mb-4 transition-all duration-1000 delay-400 ${
              barangaysAnimation.isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            Serving All Barangays
          </h2>
          <p
            className={`text-xl text-gray-300 max-w-3xl mx-auto transition-all duration-1000 delay-600 ${
              barangaysAnimation.isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            SINAG connects and empowers all 25 barangays of Sulop Municipality
          </p>
        </div>

        {/* Interactive Map Visualization */}
        <div
          className={`relative max-w-5xl mx-auto h-96 md:h-[500px] transition-all duration-700 delay-200 ${
            barangaysAnimation.isVisible
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95"
          }`}
        >
          {/* Connection Lines - Following Sulop's geographic pattern */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
            <defs>
              {/* Gradient for connection lines */}
              <linearGradient
                id="connectionGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="rgba(251, 191, 36, 0.1)" />
                <stop offset="50%" stopColor="rgba(251, 191, 36, 0.4)" />
                <stop offset="100%" stopColor="rgba(251, 191, 36, 0.1)" />
              </linearGradient>
              {/* Animated gradient for active connections */}
              <linearGradient
                id="activeConnectionGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="rgba(251, 191, 36, 0.8)">
                  <animate
                    attributeName="stop-color"
                    values="rgba(251, 191, 36, 0.8);rgba(245, 158, 11, 0.8);rgba(251, 191, 36, 0.8)"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="50%" stopColor="rgba(245, 158, 11, 1.0)">
                  <animate
                    attributeName="stop-color"
                    values="rgba(245, 158, 11, 1.0);rgba(251, 191, 36, 1.0);rgba(245, 158, 11, 1.0)"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" stopColor="rgba(251, 191, 36, 0.8)">
                  <animate
                    attributeName="stop-color"
                    values="rgba(251, 191, 36, 0.8);rgba(245, 158, 11, 0.8);rgba(251, 191, 36, 0.8)"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </stop>
              </linearGradient>
            </defs>

            {/* Main roads and connections based on Sulop's layout */}
            <g fill="none">
              {/* Central hub connections (Municipal Hall to major areas) - Animated drawing effect */}
              <path
                d="M400,200 L200,120"
                stroke="url(#connectionGradient)"
                strokeWidth="2"
                strokeDasharray="3,3"
                className={`transition-all duration-1000 delay-300 ${
                  barangaysAnimation.isVisible ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  strokeDashoffset: barangaysAnimation.isVisible ? "0" : "400",
                  transition: "stroke-dashoffset 1s ease-out 0.3s",
                }}
              />
              <path
                d="M400,200 L600,160"
                stroke="url(#connectionGradient)"
                strokeWidth="2"
                strokeDasharray="3,3"
                className={`transition-all duration-1000 delay-400 ${
                  barangaysAnimation.isVisible ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  strokeDashoffset: barangaysAnimation.isVisible ? "0" : "400",
                  transition: "stroke-dashoffset 1s ease-out 0.4s",
                }}
              />
              <path
                d="M400,200 L350,100"
                stroke="url(#connectionGradient)"
                strokeWidth="2"
                strokeDasharray="3,3"
                className={`transition-all duration-1000 delay-500 ${
                  barangaysAnimation.isVisible ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  strokeDashoffset: barangaysAnimation.isVisible ? "0" : "400",
                  transition: "stroke-dashoffset 1s ease-out 0.5s",
                }}
              />
              <path
                d="M400,200 L450,320"
                stroke="url(#connectionGradient)"
                strokeWidth="2"
                strokeDasharray="3,3"
                className={`transition-all duration-1000 delay-600 ${
                  barangaysAnimation.isVisible ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  strokeDashoffset: barangaysAnimation.isVisible ? "0" : "400",
                  transition: "stroke-dashoffset 1s ease-out 0.6s",
                }}
              />

              {/* Regional connections - Staggered animation */}
              <path
                d="M200,120 L150,80 L100,100 L120,160 L180,180 L200,120"
                stroke="url(#activeConnectionGradient)"
                strokeWidth="1.5"
                className={`transition-all duration-1200 delay-500 ${
                  barangaysAnimation.isVisible ? "opacity-100" : "opacity-0"
                }`}
              />
              <path
                d="M600,160 L650,120 L700,140 L680,200 L620,220 L600,160"
                stroke="url(#activeConnectionGradient)"
                strokeWidth="1.5"
                className={`transition-all duration-1200 delay-600 ${
                  barangaysAnimation.isVisible ? "opacity-100" : "opacity-0"
                }`}
              />
              <path
                d="M350,100 L300,60 L400,50 L450,80 L350,100"
                stroke="url(#activeConnectionGradient)"
                strokeWidth="1.5"
                className={`transition-all duration-1200 delay-700 ${
                  barangaysAnimation.isVisible ? "opacity-100" : "opacity-0"
                }`}
              />
              <path
                d="M450,320 L400,360 L350,340 L380,300 L450,320"
                stroke="url(#activeConnectionGradient)"
                strokeWidth="1.5"
                className={`transition-all duration-1200 delay-800 ${
                  barangaysAnimation.isVisible ? "opacity-100" : "opacity-0"
                }`}
              />
            </g>
          </svg>

          {/* Barangay Dots - Positioned based on Sulop's actual geography */}
          {(
            barangays ??
            (Array.from({ length: 25 }, (_, i) => ({
              id: i + 1,
              name: `Barangay ${i + 1}`,
            })) as Array<{ id: number; name: string }>)
          )
            .slice(0, 25)
            .map((b: { id: number; name: string }, i: number) => {
              // More realistic positioning based on Sulop's geographic layout
              const positions = [
                // Western barangays (like Tanwalang, Lati-an, Panaglib areas)
                { x: 12, y: 30, delay: 0, cluster: "west" },
                { x: 18, y: 25, delay: 0.1, cluster: "west" },
                { x: 15, y: 40, delay: 0.2, cluster: "west" },
                { x: 22, y: 35, delay: 0.3, cluster: "west" },
                { x: 25, y: 45, delay: 0.4, cluster: "west" },

                // Northern barangays (like Harada Butai, Tala-o areas)
                { x: 35, y: 15, delay: 0.5, cluster: "north" },
                { x: 42, y: 12, delay: 0.6, cluster: "north" },
                { x: 48, y: 18, delay: 0.7, cluster: "north" },
                { x: 38, y: 22, delay: 0.8, cluster: "north" },
                { x: 45, y: 25, delay: 0.9, cluster: "north" },

                // Eastern barangays (like Balasinon, Bagumbayan areas)
                { x: 75, y: 30, delay: 1.0, cluster: "east" },
                { x: 82, y: 35, delay: 1.1, cluster: "east" },
                { x: 78, y: 45, delay: 1.2, cluster: "east" },
                { x: 85, y: 40, delay: 1.3, cluster: "east" },
                { x: 80, y: 55, delay: 1.4, cluster: "east" },

                // Southern barangays (like New Baclayon, Waterfall areas)
                { x: 45, y: 80, delay: 1.5, cluster: "south" },
                { x: 52, y: 85, delay: 1.6, cluster: "south" },
                { x: 38, y: 85, delay: 1.7, cluster: "south" },
                { x: 48, y: 75, delay: 1.8, cluster: "south" },
                { x: 42, y: 90, delay: 1.9, cluster: "south" },

                // Central/Urban barangays (moved away from Municipal Hall center)
                { x: 65, y: 42, delay: 2.0, cluster: "center" },
                { x: 30, y: 48, delay: 2.1, cluster: "center" },
                { x: 68, y: 62, delay: 2.2, cluster: "center" },
                { x: 28, y: 62, delay: 2.3, cluster: "center" },
                { x: 58, y: 35, delay: 2.4, cluster: "center" },
              ];

              const pos = positions[i];
              const isHighlighted = i % 6 === 0; // Highlight every 6th dot for better distribution

              // Color coding based on geographic clusters
              const getClusterColor = (cluster: string) => {
                switch (cluster) {
                  case "west":
                    return "bg-[#fbbf24]";
                  case "north":
                    return "bg-[#f59e0b]";
                  case "east":
                    return "bg-[#d97706]";
                  case "south":
                    return "bg-[#b45309]";
                  case "center":
                    return "bg-[#fbbf24]";
                  default:
                    return "bg-gray-400";
                }
              };

              return (
                <div
                  key={i}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 hover:scale-150 cursor-pointer group ${
                    isHighlighted ? "animate-pulse" : ""
                  } ${
                    barangaysAnimation.isVisible
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-0"
                  }`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    animationDelay: `${pos.delay}s`,
                    transitionDelay: `${1.2 + pos.delay * 0.08}s`, // Faster staggered entrance
                  }}
                >
                  {/* Dot with cluster-based coloring */}
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      isHighlighted
                        ? `${getClusterColor(
                            pos.cluster
                          )} shadow-lg shadow-[#fbbf24]/50`
                        : `${getClusterColor(
                            pos.cluster
                          )} opacity-80 hover:opacity-100 group-hover:shadow-lg group-hover:shadow-[#fbbf24]/50`
                    }`}
                  ></div>

                  {/* Ripple Effect */}
                  <div
                    className={`absolute inset-0 rounded-full transition-all duration-700 ${
                      isHighlighted
                        ? "bg-[#fbbf24]/20 animate-ping"
                        : "bg-transparent group-hover:bg-[#fbbf24]/20 group-hover:animate-ping"
                    }`}
                    style={{ animationDelay: `${pos.delay}s` }}
                  ></div>

                  {/* Enhanced Tooltip with cluster info */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-lg">
                    <div className="font-semibold">Barangay {i + 1}</div>
                    <div className="text-gray-300 capitalize">
                      {pos.cluster}ern Area
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Central Hub (Municipal Hall) - Positioned more centrally like in the map */}
          <div
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1200 delay-3000 ${
              barangaysAnimation.isVisible
                ? "opacity-100 scale-100"
                : "opacity-0 scale-0"
            }`}
          >
            <div className="relative">
              {/* Enhanced Municipal Hall with special effects */}
              <div
                className={`w-12 h-12 bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#d97706] rounded-full shadow-2xl flex items-center justify-center border-4 border-white transition-all duration-1000 ${
                  barangaysAnimation.isVisible ? "animate-pulse" : ""
                }`}
              >
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-inner">
                  <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-pulse"></div>
                </div>
              </div>

              {/* Enhanced ripple effects with staggered animations */}
              <div
                className={`absolute inset-0 bg-[#fbbf24]/30 rounded-full transition-all duration-1000 delay-3200 ${
                  barangaysAnimation.isVisible
                    ? "animate-ping opacity-100"
                    : "opacity-0"
                }`}
              ></div>
              <div
                className={`absolute inset-0 bg-[#f59e0b]/20 rounded-full transition-all duration-1000 delay-3400 ${
                  barangaysAnimation.isVisible
                    ? "animate-ping opacity-100"
                    : "opacity-0"
                }`}
                style={{ animationDelay: "0.5s" }}
              ></div>
              <div
                className={`absolute inset-0 bg-[#d97706]/15 rounded-full transition-all duration-1000 delay-3600 ${
                  barangaysAnimation.isVisible
                    ? "animate-ping opacity-100"
                    : "opacity-0"
                }`}
                style={{ animationDelay: "1s" }}
              ></div>

              {/* Rotating orbit effect */}
              <div
                className={`absolute inset-0 w-16 h-16 -top-2 -left-2 border border-[#fbbf24]/30 rounded-full transition-all duration-1000 delay-3800 ${
                  barangaysAnimation.isVisible
                    ? "opacity-100 animate-spin"
                    : "opacity-0"
                }`}
                style={{ animationDuration: "8s" }}
              >
                <div className="absolute top-0 left-1/2 w-1 h-1 bg-[#fbbf24] rounded-full transform -translate-x-1/2"></div>
                <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-[#f59e0b] rounded-full transform -translate-x-1/2"></div>
                <div className="absolute left-0 top-1/2 w-1 h-1 bg-[#d97706] rounded-full transform -translate-y-1/2"></div>
                <div className="absolute right-0 top-1/2 w-1 h-1 bg-[#fbbf24] rounded-full transform -translate-y-1/2"></div>
              </div>

              {/* Enhanced label with entrance animation */}
              <div
                className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-4 px-4 py-2 bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-black text-sm font-bold rounded-lg shadow-lg whitespace-nowrap transition-all duration-1000 delay-4000 ${
                  barangaysAnimation.isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                <div className="text-center">
                  <div className="font-bold">Sulop Municipal Hall</div>
                  <div className="text-xs opacity-80">Central Hub</div>
                </div>
                {/* Arrow pointing to center */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#fbbf24]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 transition-all duration-1000 delay-4500 ${
            barangaysAnimation.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <div
            className={`text-center transition-all duration-1000 delay-4700 ${
              barangaysAnimation.isVisible
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95"
            }`}
          >
            <div className="relative group">
              <div className="text-4xl md:text-5xl font-bold text-[#fbbf24] mb-2 transition-all duration-300 group-hover:scale-110">
                <span
                  className={`inline-block ${
                    barangaysAnimation.isVisible ? "animate-pulse" : ""
                  }`}
                >
                  25
                </span>
              </div>
              <div className="text-gray-300 font-medium">
                Barangays Connected
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-[#fbbf24]/30 rounded-full animate-ping"></div>
            </div>
          </div>
          <div
            className={`text-center transition-all duration-1000 delay-4900 ${
              barangaysAnimation.isVisible
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95"
            }`}
          >
            <div className="relative group">
              <div className="text-4xl md:text-5xl font-bold text-[#f59e0b] mb-2 transition-all duration-300 group-hover:scale-110">
                <span
                  className={`inline-block ${
                    barangaysAnimation.isVisible ? "animate-pulse" : ""
                  }`}
                  style={{ animationDelay: "0.5s" }}
                >
                  100%
                </span>
              </div>
              <div className="text-gray-300 font-medium">
                Coverage Across Sulop
              </div>
              {/* Decorative elements */}
              <div
                className="absolute -top-2 -right-2 w-3 h-3 bg-[#f59e0b]/30 rounded-full animate-ping"
                style={{ animationDelay: "0.5s" }}
              ></div>
            </div>
          </div>
          <div
            className={`text-center transition-all duration-1000 delay-5100 ${
              barangaysAnimation.isVisible
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95"
            }`}
          >
            <div className="relative group">
              <div className="text-4xl md:text-5xl font-bold text-[#d97706] mb-2 transition-all duration-300 group-hover:scale-110">
                <span
                  className={`inline-block ${
                    barangaysAnimation.isVisible ? "animate-pulse" : ""
                  }`}
                  style={{ animationDelay: "1s" }}
                >
                  1
                </span>
              </div>
              <div className="text-gray-300 font-medium">Unified Platform</div>
              {/* Decorative elements */}
              <div
                className="absolute -top-2 -right-2 w-3 h-3 bg-[#d97706]/30 rounded-full animate-ping"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
