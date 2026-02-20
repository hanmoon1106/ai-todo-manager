import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ai-todo-manager.vercel.app';
const TITLE = 'AI 할 일 관리 서비스';
const DESCRIPTION = 'AI가 도와주는 똑똑한 할 일 관리 서비스';

export const metadata: Metadata = {
  // ── 기본 ──
  title: {
    default: TITLE,
    template: `%s | ${TITLE}`,
  },
  description: DESCRIPTION,
  applicationName: TITLE,
  keywords: ['AI', '할 일', '할일 관리', 'Todo', '생산성', '일정 관리', 'AI Todo'],

  // ── 검색 엔진(SEO) ──
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  metadataBase: new URL(APP_URL),
  alternates: { canonical: '/' },

  // ── Open Graph (Facebook, KakaoTalk 등 SNS 미리보기) ──
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'ko_KR',
  },

  // ── Twitter Card ──
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
