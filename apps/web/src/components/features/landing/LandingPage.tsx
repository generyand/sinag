"use client";

import {
  ChallengeSection,
  Footer as OldFooter,
  MapSection,
  ProcessSection,
} from "@/components/features/landing-page";
import { Header } from "./Header";
import { HeroSection } from "./HeroSection";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Clean background - no blobs */}

      {/* Main content */}
      <div className="relative z-10">
        <Header />
        <HeroSection />
        <div id="problems" className="bg-gray-50">
          <ChallengeSection />
        </div>
        {/* Features section removed for /landing */}
        <div id="process" className="bg-white">
          <ProcessSection />
        </div>
        <div id="map" className="bg-gray-50">
          <MapSection />
        </div>
        <OldFooter />
      </div>
    </div>
  );
}
