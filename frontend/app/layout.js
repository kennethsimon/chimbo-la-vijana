import "./globals.css";
import { Geist } from "next/font/google";
import { LanguageProvider } from "../components/LanguageProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { ToastProvider } from "../components/ToastProvider";

const siteUrl = "https://www.chimbolavijana.co.tz";
const siteName = "Chimbo La Vijana Brunch";
const siteDescription = "Register for Chimbo La Vijana Brunch, receive your QR ticket by email, and help event staff manage entry, food confirmation, booth visits, and event operations.";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap"
});

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} | Event Registration`,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: [
    "Chimbo La Vijana Brunch",
    "Chimbo",
    "vijana brunch",
    "event registration Tanzania",
    "QR ticket",
    "event check-in",
    "exhibitor scanner",
    "Dar es Salaam events"
  ],
  authors: [{ name: "Chimbo La Vijana Brunch" }],
  creator: "Chimbo La Vijana Brunch",
  publisher: "Chimbo La Vijana Brunch",
  alternates: {
    canonical: "/",
    languages: {
      "sw-TZ": "/register",
      "en-TZ": "/register"
    }
  },
  openGraph: {
    type: "website",
    locale: "sw_TZ",
    alternateLocale: "en_TZ",
    url: siteUrl,
    siteName,
    title: `${siteName} | Event Registration`,
    description: siteDescription,
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: `${siteName} event ticket and QR registration`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Event Registration`,
    description: siteDescription,
    images: ["/og-image.svg"]
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/manifest.webmanifest",
  category: "event",
  formatDetection: {
    telephone: false,
    address: false,
    email: false
  },
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: "default"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="sw" className={geistSans.variable}>
      <body className={`${geistSans.className} ${geistSans.variable}`}>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
