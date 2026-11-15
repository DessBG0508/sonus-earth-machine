import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SONUS v4 — The Earth Information Machine",
  description:
    "Turn NASA Earth imagery into real-time sound. A data-sonification jukebox for the NASA Space Apps Challenge 2026 — The Earth Information Jukebox. Team Tesh Sonus.",
  keywords: [
    "SONUS",
    "NASA Space Apps 2026",
    "data sonification",
    "Earth Information Jukebox",
    "NASA SVS",
    "web audio",
  ],
  authors: [{ name: "Team Tesh Sonus" }],
};

export const viewport: Viewport = {
  themeColor: "#05070F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${grotesk.variable} ${jetbrains.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
