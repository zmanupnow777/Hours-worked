import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import { Navigation } from "@/components/navigation";

import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Hours Worked",
  description: "Remote hourly work tracking and invoice automation.",
  applicationName: "Hours Worked",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${monoFont.variable}`}>
        <div className="app-shell">
          <aside className="sidebar">
            <Navigation />
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
