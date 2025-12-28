"use client";

import { ChevronRight, ClipboardCheck, FileText, LineChart } from "lucide-react";
import Image from "next/image";
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

export function ProcessSection() {
  // Move hooks to the top level of the component
  const [activeStep, setActiveStep] = useState(0);
  const [fade, setFade] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll animation hooks for each section
  const processAnimation = useScrollAnimation();

  // Define steps data at the top level
  const steps = [
    {
      label: "Prepare & Submit",
      color: "bg-[#fbbf24]", // Orange/Yellow for action-oriented step
      activeColor: "#fbbf24",
      text: "BLGUs complete a guided self-assessment and upload all required Means of Verification (MOVs).",
      backgroundImage: "/Toolkit/Submit.mp4",
      icon: <FileText className="w-4 h-4 text-black" />,
      duration: "5-10 minutes",
      benefit: "Ensures complete documentation",
    },
    {
      label: "Validate & Calibrate",
      color: "bg-[#1A3A6D]", // DILG Blue for official review
      activeColor: "#1A3A6D",
      text: "DILG Area Assessors review the submissions for quality and provide a single, consolidated list of feedback for a one-time rework cycle.",
      backgroundImage: "/Toolkit/Validate.mp4",
      icon: <ClipboardCheck className="w-4 h-4 text-white" />,
      duration: "2-3 days",
      benefit: "Quality assurance & feedback",
    },
    {
      label: "Analyze & Improve",
      color: "bg-[#28A745]", // Success Green for positive outcome
      activeColor: "#28A745",
      text: "Final results are analyzed, generating AI-powered insights and CapDev recommendations for strategic improvement.",
      backgroundImage: "/Toolkit/Analyze.mp4",
      icon: <LineChart className="w-4 h-4 text-white" />,
      duration: "Ongoing",
      benefit: "Data-driven insights",
    },
  ];

  const stepsLength = steps.length;

  // Auto-advance carousel only when process section is visible
  useEffect(() => {
    if (processAnimation.isVisible) {
      // Reset to step 1 when first entering the section
      setActiveStep(0);
      setFade(true);
      const fadeTimeout = setTimeout(() => setFade(false), 500); // match duration-500

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % stepsLength);
      }, 7000);

      return () => {
        clearTimeout(fadeTimeout);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      // Clear the interval when section is not visible
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [processAnimation.isVisible, stepsLength]);

  return (
    <section
      ref={processAnimation.elementRef}
      className={`w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 lg:py-16 flex flex-col justify-center transition-all duration-1000 ${
        processAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      aria-labelledby="process-heading"
    >
      {/* Section Header (left-aligned, no decorative animations) */}
      <div className="text-left mb-4 md:mb-6 lg:mb-8">
        <h2
          id="process-heading"
          className="text-xl md:text-3xl lg:text-4xl font-extrabold text-black mb-1 md:mb-2"
        >
          How SINAG Works
        </h2>
        <p className="text-xs md:text-sm lg:text-base text-gray-500 max-w-3xl font-normal">
          A clear, three-step process for efficient SGLGB preparation and validation.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch gap-4 md:gap-6 lg:gap-8">
        {/* Left: Enhanced Stepper */}
        <div className="flex flex-col justify-center lg:w-2/5 mb-2 md:mb-4 lg:mb-0 order-2 lg:order-1">
          {/* Progress Overview - Compact on mobile */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 shadow-lg border border-gray-100 mb-3 md:mb-4 lg:mb-6">
            {/* Mobile: Inline layout */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`text-lg md:text-xl lg:text-2xl font-bold ${
                    activeStep === 0
                      ? "text-[#fbbf24]"
                      : activeStep === 1
                        ? "text-[#1A3A6D]"
                        : "text-[#28A745]"
                  }`}
                >
                  {activeStep + 1}/{steps.length}
                </div>
                <div className="hidden md:block text-xs text-gray-500">
                  {steps[activeStep].benefit}
                </div>
              </div>

              {/* Progress dots */}
              <div className="flex gap-1.5">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ${
                      idx === activeStep
                        ? `${steps[idx].color} scale-125 shadow-lg`
                        : idx < activeStep
                          ? `${steps[idx].color}`
                          : "bg-[#E9ECEF]"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-1 md:h-1.5 mt-2 md:mt-3">
              <div
                className={`h-1 md:h-1.5 rounded-full transition-all duration-700 ease-in-out ${
                  activeStep === 0
                    ? "bg-[#fbbf24]"
                    : activeStep === 1
                      ? "bg-[#1A3A6D]"
                      : "bg-[#28A745]"
                }`}
                style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Interactive Step Buttons */}
          <div className="flex flex-col gap-1.5 md:gap-2 lg:gap-3">
            {steps.map((step, idx) => (
              <button
                key={idx}
                className={`group flex items-center w-full p-2.5 md:p-3 lg:p-4 text-left rounded-lg md:rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  activeStep === idx
                    ? "bg-white shadow-lg border-2 transform scale-[1.02] md:scale-105"
                    : "bg-white/50 border border-gray-200 hover:bg-white hover:shadow-md"
                }`}
                style={
                  activeStep === idx
                    ? ({
                        borderColor: steps[idx].activeColor,
                        "--tw-ring-color": steps[idx].activeColor,
                      } as React.CSSProperties)
                    : {}
                }
                onClick={() => {
                  setActiveStep(idx);
                  if (timerRef.current) clearInterval(timerRef.current);
                }}
                aria-pressed={activeStep === idx}
                aria-label={`Step ${idx + 1}: ${step.label}`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full font-bold text-sm md:text-base lg:text-lg mr-2 md:mr-3 lg:mr-4 transition-all duration-300 flex-shrink-0 ${
                    activeStep === idx
                      ? `${step.color} shadow-lg ${idx === 0 ? "text-black" : "text-white"}`
                      : `${step.color} opacity-70 group-hover:opacity-100 ${
                          idx === 0 ? "text-black" : "text-white"
                        }`
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <span
                      className={`hidden md:flex items-center justify-center w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-lg flex-shrink-0 ${
                        step.color
                      } ${
                        activeStep === idx ? "opacity-100" : "opacity-70"
                      } transition-all duration-300`}
                    >
                      {step.icon}
                    </span>
                    <div
                      style={{
                        color: activeStep === idx ? step.activeColor : "#374151",
                      }}
                      className="font-bold text-xs md:text-sm lg:text-base transition-colors duration-300 truncate"
                    >
                      {step.label}
                    </div>
                    {activeStep === idx && (
                      <ChevronRight
                        className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0"
                        style={{ color: step.activeColor }}
                      />
                    )}
                  </div>
                  <div className="text-[10px] md:text-xs lg:text-sm text-gray-600 mt-0.5 truncate">
                    {step.duration} • {step.benefit}
                  </div>
                </div>
                {activeStep === idx && (
                  <div
                    className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse flex-shrink-0 ${step.color}`}
                  ></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Enhanced Content Display */}
        <div className="flex-1 lg:w-1/2 order-1 lg:order-2">
          <div
            key={activeStep}
            className={`relative bg-white rounded-xl md:rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-500 min-h-[280px] md:min-h-[350px] lg:min-h-[500px] ${
              fade ? "opacity-0 scale-95" : "opacity-100 scale-100"
            }`}
          >
            {/* Background Media */}
            <div
              className={`absolute inset-0 px-6 md:px-8 ${
                activeStep === 0 ? "pt-2" : "pt-8"
              } flex items-start justify-center`}
            >
              {steps[activeStep].backgroundImage.endsWith(".mp4") ? (
                <video
                  key={steps[activeStep].backgroundImage}
                  src={steps[activeStep].backgroundImage}
                  className={`w-full h-full object-contain rounded-xl ${
                    activeStep === 0 ? "-mt-8" : "mt-2"
                  } ${activeStep === 1 ? "max-h-[75%] md:max-h-[70%]" : ""} ${
                    activeStep === 2 ? "max-h-[75%] md:max-h-[70%] -mt-2" : ""
                  }`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  style={{
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                    WebkitTransform: "translateZ(0)",
                    imageRendering: "crisp-edges",
                  }}
                />
              ) : (
                <Image
                  src={steps[activeStep].backgroundImage}
                  alt={`Step ${activeStep + 1}: ${steps[activeStep].label} process illustration`}
                  fill
                  className={`w-full h-full object-contain rounded-xl ${
                    activeStep === 0 ? "-mt-4" : "mt-2"
                  } ${activeStep === 1 ? "max-h-[75%] md:max-h-[70%]" : ""} ${
                    activeStep === 2 ? "max-h-[75%] md:max-h-[70%] -mt-2" : ""
                  }`}
                />
              )}
              {/* Removed overlay per request: keep media clean with no gradient */}
            </div>

            {/* Content Overlay - Positioned at bottom like footer */}
            <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4 lg:p-6">
              {/* Step Badge */}
              <div className="mb-2 md:mb-3">
                <span
                  className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs lg:text-sm font-bold shadow-lg ${
                    steps[activeStep].color
                  } ${activeStep === 0 ? "text-black" : "text-white"}`}
                >
                  <span className="flex items-center justify-center">{steps[activeStep].icon}</span>
                  Step {activeStep + 1}: {steps[activeStep].label}
                </span>
              </div>

              {/* Main Content */}
              <div className="bg-white rounded-md p-2 md:p-3 lg:p-4 shadow-xl border border-gray-200 relative overflow-hidden">
                {/* Visible top accent border */}
                <div
                  className={`absolute top-0 left-0 w-full h-0.5 md:h-1 ${steps[activeStep].color}`}
                  aria-hidden="true"
                ></div>
                <p className="text-xs md:text-sm lg:text-base font-medium leading-relaxed text-gray-800 mb-1.5 md:mb-2">
                  {steps[activeStep].text}
                </p>

                {/* Step Metrics - Hidden on mobile to save space */}
                <div className="hidden md:flex flex-row items-center gap-4 text-xs lg:text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${steps[activeStep].color}`}
                    ></div>
                    <span className="font-medium text-gray-700">{steps[activeStep].duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="font-medium text-gray-700">{steps[activeStep].benefit}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <div className="absolute top-[40%] md:top-1/2 left-1 md:left-3 right-1 md:right-3 flex justify-between transform -translate-y-1/2 pointer-events-none">
              <button
                onClick={() => {
                  const prevStep = activeStep === 0 ? steps.length - 1 : activeStep - 1;
                  setActiveStep(prevStep);
                  if (timerRef.current) clearInterval(timerRef.current);
                }}
                className="w-8 h-8 md:w-10 md:h-10 lg:w-11 lg:h-11 bg-white/90 hover:bg-white shadow-lg hover:shadow-xl rounded-full flex items-center justify-center text-gray-700 hover:text-gray-900 transition-all duration-300 hover:scale-110 pointer-events-auto focus:outline-none focus:ring-2 focus:ring-gray-300 border border-gray-200"
                aria-label="Previous step"
              >
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={() => {
                  const nextStep = activeStep === steps.length - 1 ? 0 : activeStep + 1;
                  setActiveStep(nextStep);
                  if (timerRef.current) clearInterval(timerRef.current);
                }}
                className="w-8 h-8 md:w-10 md:h-10 lg:w-11 lg:h-11 bg-white/90 hover:bg-white shadow-lg hover:shadow-xl rounded-full flex items-center justify-center text-gray-700 hover:text-gray-900 transition-all duration-300 hover:scale-110 pointer-events-auto focus:outline-none focus:ring-2 focus:ring-gray-300 border border-gray-200"
                aria-label="Next step"
              >
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
