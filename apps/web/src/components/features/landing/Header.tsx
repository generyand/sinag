"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogIn, Menu, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

const NavLinks = ({
  mobile = false,
  scrollToSection,
}: {
  mobile?: boolean;
  scrollToSection: (sectionId: string) => void;
}) => (
  <>
    {[
      { id: "home", label: "Home" },
      { id: "problems", label: "The Challenge" },
      { id: "process", label: "The Workflow" },
      { id: "coverage", label: "Coverage" },
    ].map((link) => (
      <button
        key={link.id}
        onClick={() => scrollToSection(link.id)}
        className={`text-gray-700 hover:text-[#fbbf24] hover:font-semibold transition-all duration-300 cursor-pointer bg-transparent border-none outline-none rounded-md hover:bg-[#fbbf24]/10 ${
          mobile
            ? "block w-full text-left px-4 py-3 text-lg font-medium"
            : "p-2 transform hover:scale-105"
        }`}
      >
        {link.label}
      </button>
    ))}
  </>
);

export function Header() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoginHovered, setIsLoginHovered] = useState(false);
  const [showLoginAnimation, setShowLoginAnimation] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const headerOffset = 80;
      const elementPosition = section.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setIsOpen(false);
    }
  };

  const handleLoginClick = () => {
    setShowLoginAnimation(true);
    setTimeout(() => {
      window.location.href = "/login";
    }, 800);
  };

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <header className="border-b border-gray-200 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20 transition-all duration-300">
          {/* Logo and Product Name */}
          <div
            className={`flex items-center space-x-3 transition-all duration-700 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
            }`}
          >
            <div className="relative group cursor-pointer" onClick={() => scrollToSection("home")}>
              <Image
                src="/logo/logo.webp"
                alt="SINAG official logo"
                width={72}
                height={72}
                sizes="40px"
                className="w-10 h-10 md:w-12 md:h-12 object-contain group-hover:scale-110 transition-transform duration-300"
                priority
              />
              {isLoginHovered && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              )}
            </div>
            <div className="leading-tight cursor-pointer" onClick={() => scrollToSection("home")}>
              <div className="font-extrabold text-lg md:text-xl tracking-tight text-gray-900 group-hover:text-[#fbbf24] transition-colors duration-300">
                SINAG
              </div>
              <div className="hidden lg:block text-xs text-gray-600 font-medium">
                SGLGB Insights Nurturing Assessments and Governance
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav
            className={`hidden lg:flex items-center space-x-6 xl:space-x-8 transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            }`}
          >
            <NavLinks scrollToSection={scrollToSection} />
          </nav>

          {/* Desktop CTA Button */}
          <div
            className={`hidden lg:flex items-center transition-all duration-700 delay-400 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
            }`}
          >
            <Button
              onClick={handleLoginClick}
              onMouseEnter={() => setIsLoginHovered(true)}
              onMouseLeave={() => setIsLoginHovered(false)}
              className={`group relative overflow-hidden bg-[#fbbf24] text-black hover:bg-[#fbbf24]/90 transition-all duration-300 font-bold px-6 py-2.5 border-0 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-base rounded-full ${
                showLoginAnimation ? "animate-pulse bg-green-500 hover:bg-green-600" : ""
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
                  <span>Login Portal</span>
                </div>
              )}

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </Button>
          </div>

          {/* Mobile & Tablet Menu Trigger */}
          <div className="flex lg:hidden items-center gap-4">
            {/* Mobile CTA (Small) */}
            <Button
              size="sm"
              onClick={handleLoginClick}
              className="bg-[#fbbf24] text-black hover:bg-[#fbbf24]/90 font-semibold text-xs px-3 h-8 rounded-full shadow-sm"
            >
              Login
            </Button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] flex flex-col pt-10">
                <SheetHeader className="mb-6 text-left px-4">
                  <SheetTitle className="text-xl font-extrabold text-[#fbbf24]">Menu</SheetTitle>
                </SheetHeader>

                <nav className="flex flex-col space-y-2">
                  <NavLinks mobile scrollToSection={scrollToSection} />
                </nav>

                <div className="px-4 mt-6">
                  <div className="p-4 bg-muted/30 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground mb-3 text-center">
                      Ready to access the dashboard?
                    </p>
                    <Button
                      className="w-full bg-[#fbbf24] text-black hover:bg-[#fbbf24]/90 font-bold"
                      onClick={handleLoginClick}
                    >
                      Access Login Portal
                    </Button>
                  </div>
                </div>

                {/* Logo at very bottom */}
                <div className="mt-auto px-4 pb-6">
                  <div className="flex items-center justify-center space-x-3 pt-4 border-t border-border">
                    <Image
                      src="/logo/logo.webp"
                      alt="SINAG Logo"
                      width={32}
                      height={32}
                      className="w-8 h-8 object-contain"
                    />
                    <div>
                      <div className="text-sm font-extrabold text-[#fbbf24]">SINAG</div>
                      <p className="text-[10px] text-muted-foreground">
                        SGLGB Insights Nurturing Assessments and Governance
                      </p>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
