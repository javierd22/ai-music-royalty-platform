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
  title: "AI Music Royalty Platform",
  description: "AI-powered music royalty management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-white text-black`}>
        <header className="border-b">
          <nav className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-6">
            <a href="/" className="font-semibold">AI Music Royalty Platform</a>
            <a href="/upload">Upload</a>
            <a href="/result">Result</a>
            <a href="/dashboard">Dashboard</a>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
