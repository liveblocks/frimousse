import { Footer } from "@/components/sections/footer";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import type { PropsWithChildren } from "react";
import { Toaster } from "sonner";
import { DynamicMaximumScaleMeta } from "./layout.client";
import "./styles.css";

const inter = localFont({
  src: "./inter-variable.woff2",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const config = {
  name: "Frimousse — An emoji picker for React",
  url: "https://frimousse.liveblocks.io",
  description:
    "A lightweight, unstyled, and composable emoji picker for React. Frimousse is an open-source library that provides you with primitive components, originally created for Liveblocks Comments. Styles can be applied with CSS, Tailwind, JS-in-CSS, and more.",
  links: {
    twitter: "https://x.com/liveblocks",
    github: "https://github.com/liveblocks/frimousse",
  },
} as const;

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
      <body className={cn(inter.variable, jetbrainsMono.variable)}>
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
