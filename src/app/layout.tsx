import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Echo Shelf",
    default: "Echo Shelf 2.0 — Personal Intelligence Vault",
  },
  description: "Capture, connect, and resurface personal knowledge with AI-powered intelligence.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#040D0A] text-[#F0FDF4]">
        {children}
      </body>
    </html>
  );
}
