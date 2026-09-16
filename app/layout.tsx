import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Forgeai — build something great",
    template: "%s · Forgeai",
  },
  description:
    "Upload a design image or screenshot, or simply chat, and get a production-ready, beautiful application back.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          // Matches the indigo→fuchsia accent used across the marketing pages.
          colorPrimary: "#4f46e5",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html lang="en" className={cn(inter.variable, "scroll-smooth")}>
        <body>
          {children}
          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}