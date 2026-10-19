import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Doc - Doctor",
  description: "Doc - Doctor: Instant verified document generator.",
};

import { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleSignInModal } from "@/components/auth/GoogleSignInModal";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#F8F6F0] text-[#1C2622] selection:bg-[#E7F3ED] selection:text-[#1F6954]">
        <AuthProvider>
          {children}
          <Suspense fallback={null}>
            <GoogleSignInModal />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
