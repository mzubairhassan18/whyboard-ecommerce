import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

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
  metadataBase: new URL("https://ecommerce.whyboard.app"),
  title: "Whyboard — why your revenue moved",
  description:
    "Drop your orders CSV. Whyboard queries the store like a detective — products, channels, cohorts, discounts — and tells you why revenue moved, with the receipts.",
  openGraph: {
    title: "Whyboard — why your revenue moved",
    description: "An AI detective for your store. Orders CSV in, evidence-backed story out.",
    url: "https://ecommerce.whyboard.app",
    siteName: "Whyboard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whyboard — why your revenue moved",
    description: "Orders CSV in, evidence-backed story out.",
  },
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
