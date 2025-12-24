import type { Metadata } from "next";
import { Modals } from "@/components/modals";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReTexture | Retail Media Creative Studio",
  description: "Create professional, guideline-compliant retail media creatives with AI-powered tools",
  icons: {
    icon: "/Retexture-logo.png",
    shortcut: "/Retexture-logo.png",
    apple: "/Retexture-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <Toaster />
          <Modals />
          {children}
        </Providers>
      </body>
    </html>
  );
}
