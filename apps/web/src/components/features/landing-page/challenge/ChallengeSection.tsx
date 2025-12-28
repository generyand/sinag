"use client";

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

// Challenge card data type
interface ChallengeCard {
  id: string;
  title: string;
  icon?: React.ReactNode;
  imageSrc?: string;
  statistic: string;
  statisticLabel: string;
  description: string;
  solution: string;
  color: string;
  delay: number;
}

// Challenge cards data
const challengeCards: ChallengeCard[] = [
  {
    id: "digitize-processes",
    title: "Digitize Manual Processes",
    imageSrc: "/Toolkit/manual.webp",
    statistic: "70%",
    statisticLabel: "Time lost on paperwork",
    description:
      "Move beyond paper-based checklists and physical document submissions to a secure, centralized digital workflow.",
    solution: "✓ Centralized Digital Workflow",
    color: "bg-[#fbbf24]",
    delay: 300,
  },
  {
    id: "proactive-preparation",
    title: "Empower Proactive Preparation",
    imageSrc: "/Toolkit/empower.webp",
    statistic: "45%",
    statisticLabel: "Fail due to unpreparedness",
    description:
      "Provide barangays with a powerful self-assessment tool to identify and rectify weaknesses before the official audit.",
    solution: "✓ Guided Self-Assessment Tool",
    color: "bg-[#f59e0b]",
    delay: 400,
  },
  {
    id: "improve-pass-rates",
    title: "Improve SGLGB Pass Rates",
    imageSrc: "/Toolkit/pass-rate.webp",
    statistic: "30%",
    statisticLabel: "Gap between local & national",
    description:
      "Address the discrepancy between local and national validation results by ensuring submissions meet the highest standards of quality.",
    solution: "✓ Data-Driven Gap Analysis",
    color: "bg-[#d97706]",
    delay: 500,
  },
];

export function ChallengeSection() {
  const challengeAnimation = useScrollAnimation();

  return (
    <section
      ref={challengeAnimation.elementRef}
      className={`w-full max-w-7xl mx-auto min-h-[50vh] lg:min-h-screen px-4 md:px-8 py-12 md:py-20 flex flex-col justify-center transition-all duration-1000 ${
        challengeAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      aria-labelledby="challenges-heading"
    >
      <div
        className={`text-left mb-6 md:mb-8 transition-all duration-1000 delay-200 ${
          challengeAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <h2
          id="challenges-heading"
          className="text-2xl md:text-4xl lg:text-4xl font-extrabold text-black mb-2"
        >
          A Proactive Approach to Governance
        </h2>
        <p className="text-sm md:text-base text-gray-500 max-w-3xl font-normal">
          Bridging the gap between municipal preparation and national standards.
        </p>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8"
        role="list"
      >
        {challengeCards.map((card) => (
          <article
            key={card.id}
            className={`group bg-white rounded-2xl shadow-lg p-5 md:p-8 flex flex-col items-start text-left border border-gray-100 transition-all duration-300 relative overflow-hidden ${
              challengeAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            role="listitem"
            aria-labelledby={`challenge-${card.id}-title`}
          >
            {/* Background accent - red theme for problem */}
            <div
              className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-400 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}
              aria-hidden="true"
            ></div>

            {/* Image container: subtle gray, small border, centered image */}
            <div className="relative mb-4 md:mb-6 w-full">
              <div className="h-28 md:h-36 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg">
                {card.imageSrc ? (
                  <Image
                    src={card.imageSrc}
                    alt={`${card.title} icon`}
                    width={88}
                    height={88}
                    className="object-contain w-16 h-16 md:w-[88px] md:h-[88px]"
                  />
                ) : null}
              </div>
            </div>

            <h3
              id={`challenge-${card.id}-title`}
              className="text-lg md:text-xl font-bold text-black mb-3 md:mb-4"
            >
              {card.title}
            </h3>

            {/* Removed percentage/statistics pill for cleaner layout */}

            <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
              {card.description}
            </p>

            {/* Solution Preview (subtle, descriptive outcome) */}
            <div className="mt-auto pt-3 md:pt-4 border-t border-gray-100 w-full">
              <div className="flex items-center gap-2 text-gray-600 text-xs md:text-sm font-medium">
                <span className="text-green-600">{card.solution}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
