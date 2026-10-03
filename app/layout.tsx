import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { THEME_BOOTSTRAP } from "@/lib/theme";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "goblin",
  description: "Reads a public GitHub repository and draws it as a dependency map.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      // The pre-paint script replaces this before anything is drawn, so the
      // served value and the hydrated value differ by design.
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      {/* Browser extensions add attributes to body before React hydrates
          (ColorZilla's cz-shortcut-listen, for one). This covers body's own
          attributes only, not anything rendered inside it. */}
      <body suppressHydrationWarning className="h-full bg-sunken font-sans text-fg antialiased">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
