import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import "@/styles/design-tokens.css";
import { BrandingProvider } from "@/components/providers/BrandingProvider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

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
    <html lang="en">
      <body
        className={`${manrope.variable} ${inter.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <BrandingProvider>
          {children}
        </BrandingProvider>
      </body>
    </html>
  );
}
