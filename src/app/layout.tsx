import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { themeScript } from "@/lib/theme";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ezPark",
  description: "Driveway parking near the game or concert, booked in minutes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set by themeScript before paint; suppressHydrationWarning lets the DOM win.
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${jakarta.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
