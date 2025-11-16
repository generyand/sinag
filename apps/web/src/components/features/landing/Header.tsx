"use client";

import { Button } from "@/components/ui/button";
import { LogIn, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function Header() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoginHovered, setIsLoginHovered] = useState(false);
  const [showLoginAnimation, setShowLoginAnimation] = useState(false);

  useEffect(() => {
    // Trigger header animations on mount
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Smooth scroll function with header offset
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 64; // Height of the sticky header (h-16 = 64px)
      const elementPosition = element.offsetTop - headerHeight;

      window.scrollTo({
        top: elementPosition,
        behavior: "smooth",
      });
    }
  };

  const handleLoginClick = () => {
    setShowLoginAnimation(true);
    setTimeout(() => {
      window.location.href = "/login";
    }, 400);
  };
  return (
    <header className="border-b border-gray-200 sticky top-0 z-50 shadow-sm backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Product Name */}
          <div
            className={`flex items-center space-x-3 transition-all duration-700 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-4"
            }`}
          >
            <div className="relative">
              <Image
                src="/logo/logo.webp"
                alt="SINAG official logo"
                width={72}
                height={72}
                sizes="40px"
                className="w-9 h-9 md:w-10 md:h-10 object-contain hover:scale-110 transition-transform duration-300"
                priority
              />
              {isLoginHovered && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              )}
            </div>
            <div className="leading-tight">
              <div className="font-extrabold text-base md:text-lg tracking-tight text-black hover:text-[#fbbf24] transition-colors duration-300">
                SINAG
              </div>
              <div className="text-[10px] md:text-xs text-gray-500">
                SGLGB Analytics System for Sulop
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav
            className={`hidden md:flex items-center space-x-8 transition-all duration-700 delay-200 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2"
            }`}
          >
            <button
              onClick={() => scrollToSection("home")}
              className="text-black hover:text-[#fbbf24] hover:font-semibold transition-all duration-300 cursor-pointer bg-transparent border-none outline-none p-2 rounded-md hover:bg-[#fbbf24]/10 transform hover:scale-105"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("problems")}
              className="text-black hover:text-[#fbbf24] hover:font-semibold transition-all duration-300 cursor-pointer bg-transparent border-none outline-none p-2 rounded-md hover:bg-[#fbbf24]/10 transform hover:scale-105"
            >
              The Challenge
            </button>
            <button
              onClick={() => scrollToSection("process")}
              className="text-black hover:text-[#fbbf24] hover:font-semibold transition-all duration-300 cursor-pointer bg-transparent border-none outline-none p-2 rounded-md hover:bg-[#fbbf24]/10 transform hover:scale-105"
            >
              The Workflow
            </button>
            <button
              onClick={() => scrollToSection("coverage")}
              className="text-black hover:text-[#fbbf24] hover:font-semibold transition-all duration-300 cursor-pointer bg-transparent border-none outline-none p-2 rounded-md hover:bg-[#fbbf24]/10 transform hover:scale-105"
            >
              Coverage
            </button>
          </nav>

          {/* CTA Button */}
          <div
            className={`flex items-center transition-all duration-700 delay-400 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-4"
            }`}
          >
            <Button
              onClick={handleLoginClick}
              onMouseEnter={() => setIsLoginHovered(true)}
              onMouseLeave={() => setIsLoginHovered(false)}
              className={`group relative overflow-hidden bg-[#fbbf24] text-black hover:bg-[#fbbf24]/90 transition-all duration-300 font-medium px-6 py-2 border-0 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
                showLoginAnimation
                  ? "animate-pulse bg-green-500 hover:bg-green-600"
                  : ""
              }`}
            >
              {showLoginAnimation ? (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Redirecting...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  <span>Login</span>
                </div>
              )}

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
