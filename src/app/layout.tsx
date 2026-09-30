import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// simplified.org ships Geist (its primary sans, on Google Fonts) plus a
// commercial display face "Britti Sans" for a few headlines. We load Geist for
// both body and headings; Geist stands in for the commercial Britti face too.
// Sans-serif everywhere — no serif fonts anywhere in the app (PRD §3b, §7).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Ad Studio",
  description: "Make a real ad with AI in under three minutes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
