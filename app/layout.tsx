import type { Metadata } from "next";
import { JetBrains_Mono, Sora, Unbounded } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import TopBanner from "@/components/TopBanner";

const sora = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const unbounded = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cryptex Trading Platform",
  description: "A focused crypto trading workspace for charts, orders, and insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body
        className={`${sora.variable} ${unbounded.variable} ${jetBrainsMono.variable} antialiased bg-[var(--bg)] text-[var(--text)] scroll-smooth overflow-x-hidden`}
      >
        <Providers>
          <TopBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
