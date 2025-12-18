"use client";

import { Facebook, Instagram, MapPin, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

// Hero slide data type
interface HeroSlide {
  location: string;
  title: string;
  subtitle: string;
  backgroundImage: string;
}

// Hero slides data
const heroSlides: HeroSlide[] = [
  {
    location: "Sulop, Philippines",
    title: "SINAG",
    subtitle:
      "Strategic Insights Nurturing Assessments and Governance - The official SGLGB Analytics System for the Municipality of Sulop utilizing Large Language Models and Classification Algorithms.",
    backgroundImage: "/Scenery/Sulop_Hall.png",
  },
  {
    location: "Sulop, Philippines",
    title: "SINAG",
    subtitle:
      "Strategic Insights Nurturing Assessments and Governance - The official SGLGB Analytics System for the Municipality of Sulop utilizing Large Language Models and Classification Algorithms.",
    backgroundImage: "/Scenery/Sulop_Hall.png",
  },
  {
    location: "Sulop, Philippines",
    title: "SINAG",
    subtitle:
      "Strategic Insights Nurturing Assessments and Governance - The official SGLGB Analytics System for the Municipality of Sulop utilizing Large Language Models and Classification Algorithms.",
    backgroundImage: "/Scenery/Sulop_Hall.png",
  },
];

export function HeroSection() {
  // Hero carousel state
  const [activeHeroSlide] = useState(0);

  // Sticky header state
  const [isScrolled, setIsScrolled] = useState(false);

  // Hero entrance animations state
  const [heroLoaded, setHeroLoaded] = useState(false);

  const currentHeroSlide = heroSlides[activeHeroSlide];

  // Scroll event listener for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hero entrance animations - trigger on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setHeroLoaded(true);
    }, 100); // Small delay to ensure smooth entrance

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(45deg);
          }
          to {
            transform: rotate(405deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>

      {/* Sticky Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-black/95 backdrop-blur-md shadow-lg translate-y-0"
            : "bg-transparent -translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: SINAG Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-sm bg-white border-2 border-gray-300/70 shadow-md flex items-center justify-center backdrop-blur-sm">
                <Image
                  src="/officialLogo/MLGRC.webp"
                  alt="MLGRC Davao del Sur official logo"
                  width={28}
                  height={28}
                  className="lg:w-8 lg:h-8 object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-white leading-tight">
                  SINAG
                </span>
                <span className="text-xs text-gray-400 font-medium">SGLGB Analytics System</span>
              </div>
            </div>

            {/* Right: Login Button */}
            <Link href="/login">
              <button
                className="bg-transparent border-2 border-[#fbbf24] text-white px-6 py-2 rounded-lg hover:bg-[#fbbf24] hover:text-black transition-all duration-300 font-semibold text-sm transform hover:scale-105 active:scale-95 hover:shadow-lg active:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:ring-offset-2 focus:ring-offset-transparent"
                aria-label="Login to SINAG platform"
                type="button"
              >
                <span className="flex items-center gap-2">
                  Login
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section Login Button - Top Right */}
      <div
        className={`fixed top-4 right-4 lg:top-8 lg:right-8 z-40 transition-all duration-1000 ease-out delay-900 ${
          heroLoaded ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"
        }`}
      >
        <Link href="/login">
          <button
            className="bg-transparent border-2 border-[#fbbf24] text-white px-6 py-2 rounded-lg hover:bg-[#fbbf24] hover:text-black transition-all duration-300 font-semibold text-sm transform hover:scale-105 active:scale-95 hover:shadow-lg active:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:ring-offset-2 focus:ring-offset-transparent backdrop-blur-sm"
            aria-label="Login to SINAG platform"
            type="button"
          >
            <span className="flex items-center gap-2">
              Login
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </span>
          </button>
        </Link>
      </div>

      {/* Cityscape Layout - First Section */}
      <div className="flex h-[60vh] md:h-[50vh] lg:h-screen relative">
        {/* Left Sidebar - Cityscape Theme */}
        <aside
          className="hidden lg:flex lg:w-1/4 bg-black flex-col justify-between p-4 lg:p-8 transition-colors duration-300"
          role="complementary"
          aria-label="Navigation sidebar"
        >
          {/* Top: Logo and Navigation */}
          <div className="space-y-8">
            {/* Logo */}
            <div
              className={`flex items-center gap-2 lg:gap-3 transition-all duration-1000 ease-out ${
                heroLoaded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
              }`}
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-sm bg-white border-2 border-gray-300/70 shadow-md flex items-center justify-center backdrop-blur-sm">
                <Image
                  src="/officialLogo/MLGRC.webp"
                  alt="MLGRC Davao del Sur official logo"
                  width={28}
                  height={28}
                  className="lg:w-8 lg:h-8 object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg lg:text-xl tracking-tight text-white leading-tight">
                  SINAG
                </span>
                <span className="text-xs text-gray-400 font-medium">SGLGB Analytics System</span>
              </div>
            </div>
          </div>

          {/* Bottom: Social Media */}
          <div className="flex flex-col items-start space-y-50">
            <div
              className={`relative transition-all duration-1000 ease-out delay-300 ${
                heroLoaded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
              }`}
            >
              <div
                className="text-white text-sm font-medium tracking-wider"
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  transform: "rotate(180deg)",
                }}
                aria-label="Follow us on social media"
              >
                FOLLOW US
              </div>
              <div className="absolute top-30 left-3 w-px h-30 bg-white" aria-hidden="true"></div>
            </div>
            <nav
              className={`flex flex-col space-y-6 transition-all duration-1000 ease-out delay-500 ${
                heroLoaded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
              }`}
              role="navigation"
              aria-label="Social media links"
            >
              <a
                href="#"
                className="group w-10 h-10 bg-white/10 hover:bg-[#fbbf24] rounded-full flex items-center justify-center text-white hover:text-black transition-all duration-300 hover:scale-110 hover:shadow-lg backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:ring-offset-2 focus:ring-offset-black"
                aria-label="Follow us on Facebook"
                tabIndex={0}
              >
                <Facebook className="w-5 h-5" aria-hidden="true" />
              </a>
              <a
                href="#"
                className="group w-10 h-10 bg-white/10 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:shadow-lg backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:ring-offset-2 focus:ring-offset-black"
                aria-label="Follow us on Instagram"
                tabIndex={0}
              >
                <Instagram className="w-5 h-5" aria-hidden="true" />
              </a>
              <a
                href="#"
                className="group w-10 h-10 bg-white/10 hover:bg-blue-400 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:shadow-lg backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:ring-offset-2 focus:ring-offset-black"
                aria-label="Follow us on Twitter"
                tabIndex={0}
              >
                <Twitter className="w-5 h-5" aria-hidden="true" />
              </a>
            </nav>
          </div>
        </aside>

        {/* Philippine Flag - positioned between black sidebar and image like 2100 Club */}
        <div
          className={`hidden 2xl:block absolute top-2/4 left-1/8 transform -translate-y-1/2 z-30 transition-all duration-1200 ease-out delay-700 ${
            heroLoaded
              ? "opacity-100 translate-x-0 scale-100"
              : "opacity-0 -translate-x-16 scale-95"
          }`}
          role="img"
          aria-label="Philippine flag representing national identity and government authority"
        >
          <div className="relative">
            <Image
              src="/officialLogo/flag.jpg"
              alt="Philippine flag with blue, red, and white sections featuring the sun and three stars, symbolizing the Republic of the Philippines"
              width={320}
              height={520}
              className="w-72 h-[28rem] 3xl:w-80 3xl:h-[32rem] object-cover drop-shadow-2xl rounded-sm bg-white"
            />
            {/* Dark overlay for consistent styling */}
            <div className="absolute inset-0 bg-black/15 rounded-sm" aria-hidden="true"></div>
            {/* Left side gradient for blending with dark sidebar */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent rounded-sm"
              aria-hidden="true"
            ></div>
            {/* Corner blending only on left side */}
            <div
              className="absolute inset-0 rounded-sm"
              aria-hidden="true"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 25%, transparent 50%), linear-gradient(225deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 25%, transparent 50%)",
              }}
            ></div>
          </div>
        </div>

        {/* Right Content - Large Image with Overlay */}
        <main className="w-full lg:w-3/4 relative" role="main">
          {/* Background Image */}
          <div
            className={`absolute inset-0 transition-all duration-1500 ease-out ${
              heroLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
          >
            <Image
              src={currentHeroSlide.backgroundImage}
              alt="Sulop Municipal Hall, the official government building of the Municipality of Sulop in Davao del Sur, Philippines, serving as the administrative center for local governance"
              fill
              className="w-full h-full object-cover transition-opacity duration-500"
            />

            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/60" aria-hidden="true"></div>
          </div>

          {/* Content Overlay */}
          <div className="absolute bottom-6 left-4 right-4 md:bottom-8 md:right-auto lg:bottom-20 lg:left-8 xl:left-32 text-white space-y-2 lg:space-y-6 max-w-sm lg:max-w-2xl xl:max-w-3xl">
            {/* Location with enhanced styling */}
            <div
              className={`flex items-center gap-2 mb-2 backdrop-blur-sm bg-black/20 px-3 py-1.5 rounded-md border border-white/10 w-fit transition-all duration-1000 ease-out delay-300 ${
                heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              role="region"
              aria-label="Location information"
            >
              <MapPin className="w-3 h-3 lg:w-4 lg:h-4 text-[#fbbf24]" aria-hidden="true" />
              <div className="text-sm lg:text-base font-medium tracking-wide uppercase text-gray-200 hover:text-white transition-colors duration-300">
                {currentHeroSlide.location}
              </div>
            </div>

            {/* Enhanced SINAG title */}
            <div
              className={`relative transition-all duration-1200 ease-out delay-500 ${
                heroLoaded
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-12 scale-95"
              }`}
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-black text-[#fbbf24] leading-none tracking-tight mb-2 lg:mb-4 transform hover:scale-105 transition-all duration-500 ease-out">
                <span className="inline-block hover:animate-pulse">{currentHeroSlide.title}</span>
              </h1>
              {/* Subtle glow effect */}
              <div
                className="absolute inset-0 text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-black text-[#fbbf24] leading-none tracking-tight opacity-20 blur-sm -z-10"
                aria-hidden="true"
              >
                {currentHeroSlide.title}
              </div>
            </div>

            {/* Enhanced subtitle */}
            <div
              className={`text-xs sm:text-sm md:text-base lg:text-xl font-light leading-relaxed text-gray-100 max-w-2xl transition-all duration-1000 ease-out delay-700 ${
                heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <span
                className="block mb-1 md:mb-2 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider text-[#fbbf24] font-semibold"
                role="banner"
              >
                Official Platform
              </span>
              {/* Hide long subtitle on mobile, show shorter version */}
              <span className="hidden md:inline" aria-label="Platform description">{currentHeroSlide.subtitle}</span>
              <span className="md:hidden" aria-label="Platform description">Official SGLGB Analytics System for the Municipality of Sulop</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
