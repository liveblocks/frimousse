import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";
import { Toaster } from "sonner";
import { Footer } from "@/components/sections/footer";
import { cn } from "@/lib/utils";
import { DynamicMaximumScaleMeta } from "./layout.client";
import "./styles.css";
import { config } from "@/config";

const inter = localFont({
  src: "./inter-variable.woff2",
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: config.name,
    template: `%s — ${config.name}`,
  },
  metadataBase: new URL(config.url),
  alternates: {
    canonical: "/",
  },
  description: config.description,
  keywords: [
    "emoji",
    "emoji picker",
    "react",
    "unstyled",
    "component",
    "emojibase",
    "liveblocks",
  ],
  authors: [
    {
      name: "Liveblocks",
      url: "https://liveblocks.io",
    },
  ],
  creator: "Liveblocks",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: config.url,
    title: config.name,
    description: config.description,
    siteName: config.name,
  },
  twitter: {
    card: "summary_large_image",
    title: config.name,
    description: config.description,
    creator: "@liveblocks",
  },
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.variable, geistMono.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <DynamicMaximumScaleMeta />
          <Toaster mobileOffset={26} />
          <div
            className={cn(
              "container relative flex min-h-dvh flex-col",
              "before:pointer-events-none before:absolute before:inset-x-4 before:h-full before:border-x before:border-dotted md:before:inset-x-0",
            )}
          >
            {children}
          </div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
