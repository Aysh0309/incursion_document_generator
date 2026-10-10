import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Document Generator | Incursion Hackathon Track 01",
  description:
    "Turn event requirements into ready-to-use, on-brand club documents with verified information and zero hallucinated facts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-[#18181B]">
        {children}
      </body>
    </html>
  );
}
