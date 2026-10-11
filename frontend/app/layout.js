import "./globals.css";
import { Geist } from "next/font/google";
import { LanguageProvider } from "../components/LanguageProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { ToastProvider } from "../components/ToastProvider";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap"
});

export const metadata = {
  title: "Chimbo Event Platform",
  description: "Registration, QR scanning, exhibitor, and admin tools for Chimbo La Vijana Brunch"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={geistSans.variable}>
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
