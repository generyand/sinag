/**
 * Maintenance Page
 *
 * Displayed when the application is undergoing scheduled maintenance.
 * Features an optimistic message and calming animated visualization.
 */

import { Metadata } from "next";
import Image from "next/image";
import "./maintenance.css";

export const metadata: Metadata = {
  title: "Babalik Kami Agad | SINAG",
  description: "Kasalukuyang nagme-maintenance ang SINAG. Babalik kami agad-agad.",
};

export default function MaintenancePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-100">
      {/* Animated Floating Clouds */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="cloud cloud-1 absolute">
          <svg viewBox="0 0 100 50" className="h-16 w-32 fill-white/60">
            <ellipse cx="25" cy="35" rx="20" ry="12" />
            <ellipse cx="50" cy="30" rx="25" ry="15" />
            <ellipse cx="75" cy="35" rx="18" ry="10" />
            <ellipse cx="40" cy="22" rx="15" ry="10" />
            <ellipse cx="60" cy="22" rx="12" ry="8" />
          </svg>
        </div>
        <div className="cloud cloud-2 absolute">
          <svg viewBox="0 0 100 50" className="h-12 w-24 fill-white/40">
            <ellipse cx="25" cy="35" rx="20" ry="12" />
            <ellipse cx="50" cy="30" rx="25" ry="15" />
            <ellipse cx="75" cy="35" rx="18" ry="10" />
            <ellipse cx="40" cy="22" rx="15" ry="10" />
          </svg>
        </div>
        <div className="cloud cloud-3 absolute">
          <svg viewBox="0 0 100 50" className="h-10 w-20 fill-white/50">
            <ellipse cx="30" cy="32" rx="22" ry="14" />
            <ellipse cx="60" cy="30" rx="20" ry="12" />
            <ellipse cx="45" cy="20" rx="15" ry="10" />
          </svg>
        </div>
      </div>

      {/* Floating Sparkles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="sparkle absolute"
            style={{
              left: `${15 + i * 10}%`,
              top: `${20 + (i % 4) * 15}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            <svg className="h-4 w-4 fill-amber-400/60" viewBox="0 0 24 24">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        {/* Sun with Rays Container */}
        <div className="sun-container relative mx-auto mb-8 h-48 w-48">
          {/* Rotating Rays Behind Sun */}
          <div className="rays-container absolute inset-0">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="ray absolute left-1/2 top-1/2 h-28 w-2 origin-bottom rounded-full bg-gradient-to-t from-amber-400/70 via-amber-300/50 to-transparent"
                style={{
                  transform: `translateX(-50%) rotate(${i * 30}deg)`,
                  transformOrigin: "bottom center",
                }}
              />
            ))}
          </div>

          {/* Sun glow */}
          <div className="sun-glow absolute inset-6 rounded-full bg-amber-400/50 blur-xl" />

          {/* Sun core with bounce */}
          <div className="sun-core absolute inset-10 rounded-full bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 shadow-xl shadow-amber-400/50">
            {/* Sun face - friendly smile with blinking eyes */}
            <div className="flex h-full flex-col items-center justify-center">
              {/* Eyes */}
              <div className="mb-1 flex gap-4">
                <div className="eye h-2.5 w-2.5 rounded-full bg-amber-800/80" />
                <div className="eye h-2.5 w-2.5 rounded-full bg-amber-800/80" />
              </div>
              {/* Smile */}
              <div className="smile mt-1 h-3 w-6 rounded-b-full border-b-[3px] border-amber-800/80" />
            </div>
          </div>

          {/* Orbiting small rays */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-4 w-1.5 rounded-full bg-amber-500"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-44px)`,
              }}
            />
          ))}
        </div>

        {/* Heading with subtle animation */}
        <h1 className="title-bounce mb-4 text-4xl font-bold tracking-tight text-amber-900 sm:text-5xl">
          Sandali Lang Po!
        </h1>

        {/* Subheading */}
        <p className="mb-6 text-xl text-amber-800/80">
          Pinapaganda namin ang SINAG para mas makapaglingkod sa inyo.
        </p>

        {/* Description Card with hover effect */}
        <div className="message-card mb-8 rounded-2xl border border-amber-200/50 bg-white/60 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
          <p className="text-lg leading-relaxed text-amber-900/80">
            Ginagawa naming mas okay ang SINAG para sa inyo. Ang team namin ay nagwo-work para sa
            mas magandang experience.
          </p>
          <p className="mt-4 text-amber-700/70">Hindi ito magtatagal - babalik kami agad!</p>
        </div>

        {/* Animated Progress indicator */}
        <div className="mx-auto max-w-xs">
          <div className="mb-2 flex items-center justify-center gap-2 text-sm text-amber-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-600" />
            </span>
            Kasalukuyang nagme-maintenance
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-amber-200/50">
            <div className="progress-bar h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />
          </div>
        </div>
      </div>

      {/* Logos Section with hover animations */}
      <div className="relative z-10 mt-12 w-full border-t border-amber-200/30 bg-white/40 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-6">
          {/* SINAG Logo */}
          <div className="logo-item group flex flex-col items-center gap-2">
            <div className="transform transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-110">
              <Image
                src="/logo/logoWithShadow.webp"
                alt="SINAG"
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
            </div>
            <span className="text-xs font-medium text-amber-800/60 transition-colors group-hover:text-amber-900">
              SINAG
            </span>
          </div>

          {/* DILG Logo */}
          <div className="logo-item group flex flex-col items-center gap-2">
            <div className="transform transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-110">
              <Image
                src="/officialLogo/DILG.webp"
                alt="DILG"
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
            </div>
            <span className="text-xs font-medium text-amber-800/60 transition-colors group-hover:text-amber-900">
              DILG
            </span>
          </div>

          {/* MLGRC Logo */}
          <div className="logo-item group flex flex-col items-center gap-2">
            <div className="transform transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-110">
              <Image
                src="/officialLogo/MLGRC.webp"
                alt="MLGRC"
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
            </div>
            <span className="text-xs font-medium text-amber-800/60 transition-colors group-hover:text-amber-900">
              MLGRC
            </span>
          </div>

          {/* Sulop Municipal Government Logo */}
          <div className="logo-item group flex flex-col items-center gap-2">
            <div className="transform transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-110">
              <Image
                src="/officialLogo/Sulop_Municipal_Government.webp"
                alt="Sulop Municipal Government"
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
            </div>
            <span className="text-xs font-medium text-amber-800/60 transition-colors group-hover:text-amber-900">
              Sulop
            </span>
          </div>
        </div>
      </div>

      {/* Footer decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-amber-200/20 to-transparent" />
    </div>
  );
}
