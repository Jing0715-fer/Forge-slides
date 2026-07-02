import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

// System font stack — avoids Google Fonts CDN dependency (offline-safe).
// Per macOS preference: PingFang SC / Songti SC / Helvetica Neue fallbacks.
const fontSans = {
  variable: "--font-geist-sans",
};
const fontMono = {
  variable: "--font-geist-mono",
};

export const metadata: Metadata = {
  title: "SlideForge — PowerPoint-like HTML Editor",
  description: "A PowerPoint-like HTML editor for fine-tuning AI-generated slides. Drag, resize, rotate, snap to alignment guides, then export clean HTML.",
  keywords: ["HTML editor", "slide editor", "PowerPoint", "AI slides", "Next.js", "TypeScript"],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Z.ai Code Scaffold",
    description: "AI-powered development with modern React stack",
    url: "https://chat.z.ai",
    siteName: "Z.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Z.ai Code Scaffold",
    description: "AI-powered development with modern React stack",
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
        className={`${fontSans.variable} ${fontMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
        <Toaster />
        <SonnerToaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
