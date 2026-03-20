import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppNavbar } from "@/components/app/app-navbar";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: {
    default: "Zeppy",
    template: "%s | Zeppy",
  },
  description: "Multilingual AI phone investigations with live transcripts and ranked recommendations.",
  keywords: ["AI phone agent", "investigation automation", "multilingual", "live transcripts"],
  authors: [{ name: "Zeppy" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Zeppy",
    title: "Zeppy – AI Phone Investigations",
    description: "Automate multilingual phone calls to gather information and get ranked AI recommendations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zeppy – AI Phone Investigations",
    description: "Automate multilingual phone calls to gather information and get ranked AI recommendations.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-background">
          <AppNavbar />
          <main id="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
