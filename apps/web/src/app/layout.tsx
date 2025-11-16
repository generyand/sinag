import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "../providers";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SINAG - SGLGB Analytics System",
  description: "Strategic Insights Nurturing Assessments and Governance - SGLGB Analytics System for DILG",
  icons: {
    icon: "/logo/logo.webp",
    apple: "/logo/logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <SonnerToaster />
        <Toaster />
        <Providers>
        {children}
        </Providers>
      </body>
    </html>
  );
}
