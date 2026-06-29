import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Model Deep-Dive",
  description:
    "A semi-technical analysis of world models — definition, taxonomy, builders, bottlenecks, and experiments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/ppmondwest-regular.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/ppneuebit-bold.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        {/* Warm the globe texture so it's decoded by the time the hero reveals. */}
        <link
          rel="preload"
          href="/earth/textures/Material.002_diffuse.jpeg"
          as="image"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
