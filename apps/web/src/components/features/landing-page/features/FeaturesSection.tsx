"use client";

import { BarChart3, FileText, Search } from "lucide-react";
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

// Feature card data type
interface FeatureCard {
  id: string;
  title: string;
  icon: React.ReactNode;
  step: string;
  stepColor: string;
  description: string;
  bulletPoints: {
    label: string;
    color: string;
  }[];
  progressBarColor: string;
  delay: number;
}

// Feature cards data
const featureCards: FeatureCard[] = [
  {
    id: "guided-assessment",
    title: "Guided Self-Assessment",
    icon: <FileText className="w-8 h-8 text-black" />,
    step: "STEP 1",
    stepColor: "bg-green-100 text-green-700",
    description:
      "A step-by-step workflow for BLGUs to complete their Self-Evaluation Document (SED) and upload all required Means of Verification (MOVs) with confidence.",
    bulletPoints: [
      { label: "5-10 minutes", color: "bg-[#fbbf24]" },
      { label: "User-friendly", color: "bg-green-500" },
    ],
    progressBarColor: "from-[#fbbf24] to-[#f59e0b]",
    delay: 300,
  },
  {
    id: "validation-rework",
    title: "Structured Validation & Rework",
    icon: <Search className="w-8 h-8 text-black" />,
    step: "STEP 2",
    stepColor: "bg-blue-100 text-blue-700",
    description:
      "An efficient interface for DILG Area Assessors to review submissions, provide consolidated feedback, and manage a single, streamlined rework cycle.",
    bulletPoints: [
      { label: "2-3 days", color: "bg-[#f59e0b]" },
      { label: "Quality assured", color: "bg-blue-500" },
    ],
    progressBarColor: "from-[#f59e0b] to-[#d97706]",
    delay: 400,
  },
  {
    id: "analytics-insights",
    title: "Powerful Analytics & AI Insights",
    icon: <BarChart3 className="w-8 h-8 text-black" />,
    step: "ONGOING",
    stepColor: "bg-purple-100 text-purple-700",
    description:
      "A high-level dashboard with cross-matching analysis and AI-generated CapDev recommendations to support strategic decision-making.",
    bulletPoints: [
      { label: "Real-time", color: "bg-[#d97706]" },
      { label: "AI-powered", color: "bg-purple-500" },
    ],
    progressBarColor: "from-[#d97706] to-[#b45309]",
    delay: 500,
  },
];

// Statistics data
const statistics = [
  {
    value: "40+",
    label: "Barangays Served",
    color: "text-[#fbbf24]",
    position: "top-6 left-6",
    delay: 0,
  },
  {
    value: "95%",
    label: "Success Rate",
    color: "text-[#f59e0b]",
    position: "top-6 right-6",
    delay: 100,
  },
  {
    value: "60%",
    label: "Time Saved",
    color: "text-[#d97706]",
    position: "bottom-6 left-6",
    delay: 200,
  },
];

export function FeaturesSection() {
  const featuresAnimation = useScrollAnimation();

  return (
    <section
      ref={featuresAnimation.elementRef}
      className={`w-full max-w-7xl mx-auto min-h-screen px-8 py-12 flex flex-col justify-center transition-all duration-1000 ${
        featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      aria-labelledby="features-heading"
    >
      {/* Enhanced Header */}
      <div
        className={`text-left mb-12 transition-all duration-1000 delay-200 ${
          featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <h2
          id="features-heading"
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-black"
        >
          Smart Governance Toolkit
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-12">
        {/* Left: Enhanced Image with Overlay */}
        <div
          className={`flex-1 transition-all duration-1000 delay-300 ${
            featuresAnimation.isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
          }`}
        >
          <div className="relative group h-full">
            <div className="w-full h-full min-h-[500px] rounded-2xl shadow-2xl overflow-hidden relative">
              <Image
                src="/Scenery/Day_Care_Center.jpg"
                alt="Modern day care center facility showcasing community development and local governance infrastructure"
                fill
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

              {/* Floating Stats Cards */}
              {statistics.map((stat) => (
                <div
                  key={stat.label}
                  className={`absolute ${stat.position} bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg transform group-hover:scale-105 transition-all duration-300 delay-${stat.delay}`}
                >
                  <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Enhanced Feature Cards */}
        <div
          className={`flex-1 flex flex-col gap-6 transition-all duration-1000 delay-400 ${
            featuresAnimation.isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
          }`}
        >
          {featureCards.map((card) => (
            <div
              key={card.id}
              className="group bg-white shadow-xl rounded-2xl p-6 border border-gray-100 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-[#fbbf24]/30 relative overflow-hidden"
            >
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                <div
                  className={`h-full bg-gradient-to-r ${card.progressBarColor} w-0 group-hover:w-full transition-all duration-700 delay-${card.delay}`}
                ></div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                    {card.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-black group-hover:text-[#fbbf24] transition-colors duration-300">
                      {card.title}
                    </h3>
                    <div
                      className={`px-2 py-1 ${card.stepColor} text-xs font-semibold rounded-full`}
                    >
                      {card.step}
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-3">{card.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {card.bulletPoints.map((point, _index) => (
                      <div key={_index} className="flex items-center gap-1">
                        <div className={`w-2 h-2 ${point.color} rounded-full`}></div>
                        <span>{point.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
