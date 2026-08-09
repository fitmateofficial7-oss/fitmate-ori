import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import FloatingBubbleMenu from "@/components/floating-bubble-menu";
import ClientMonitoring from "@/components/client-monitoring";
import PwaManager from "@/components/pwa-manager";
import LanguageProvider from "@/components/language-provider";
import LanguageToggle from "@/components/language-toggle";
import ThemeToggle from "@/components/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeBootstrap = `
  (function () {
    try {
      var saved = localStorage.getItem("fitmate_theme");
      var dark = saved === "dark" ||
        (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
      var root = document.documentElement;
      root.classList.toggle("dark", dark);
      root.dataset.theme = dark ? "dark" : "light";
      root.style.colorScheme = dark ? "dark" : "light";
    } catch (_) {}
  })();
`;

export const metadata: Metadata = {
  applicationName: "FitMate AI",
  title: {
    default: "FitMate AI by Growsia",
    template: "%s | FitMate AI",
  },
  description:
    "AI fitness coach untuk workout, jogging GPS, konsultasi, analisis makanan, panduan gerakan 2D, dan progress tracking.",
  creator: "PT Growsia Solusi Indonesia Maju",
  publisher: "PT Growsia Solusi Indonesia Maju",
  authors: [{ name: "PT Growsia Solusi Indonesia Maju" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/fitmate-favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "FitMate AI by Growsia",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeBootstrap,
          }}
        />
      </head>
      <body className="fitmate-simple-ui min-h-full flex flex-col">
        <LanguageProvider>
          <ClientMonitoring />
          <PwaManager />
          {children}
          <FloatingBubbleMenu />
          <ThemeToggle />
          <LanguageToggle />
        </LanguageProvider>
      </body>
    </html>
  );
}
