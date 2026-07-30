import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Private ops portal — never index (search or AI training crawlers). */
export const metadata: Metadata = {
  title: {
    default: "Kpay Admin",
    template: "%s · Kpay Admin",
  },
  description: "Kpay Admin Portal — private operations console",
  applicationName: "Kpay Admin",
  referrer: "strict-origin-when-cross-origin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
      noarchive: true,
    },
  },
  other: {
    // Extra signals some AI scrapers honor
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai",
    robots: "noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
