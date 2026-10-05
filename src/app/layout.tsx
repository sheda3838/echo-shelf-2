import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Echo Shelf",
    default: "Echo Shelf 2.0 — Personal Intelligence Vault",
  },
  description: "Capture, connect, and resurface personal knowledge with AI-powered intelligence.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [
      { url: "/favicon.png", type: "image/png" },
    ],
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
