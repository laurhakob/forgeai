import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "cn";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Forgeai",
  description:
    "Build something greate with Forgeai that work the way you want.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn(inter.variable, "scroll-smooth")}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
