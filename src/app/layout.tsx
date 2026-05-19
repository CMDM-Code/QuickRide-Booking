import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "@/styles/design-tokens.css";
import { BrandingProvider } from "@/components/providers/BrandingProvider";
import { MaintenanceProvider } from "@/components/providers/MaintenanceProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "QuickRide Booking",
  description: "Premium car rental service with the motto: Comfort on the Road, Joy in Every Mile",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${inter.variable} antialiased font-sans noise-bg`}
        suppressHydrationWarning
      >
        <SettingsProvider>
          <BrandingProvider>
            <MaintenanceProvider>
              {children}
            </MaintenanceProvider>
          </BrandingProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
