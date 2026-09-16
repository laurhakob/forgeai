"use client";

import Image from "next/image";
import Link from "next/link";
import { SignInButton, useAuth, UserButton } from "@clerk/nextjs";
import { Button } from "./ui/button";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
] as const;

export function NavMenu() {
  const auth = useAuth();

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-black/[0.055] bg-[#fcfbf8]/75
      backdrop-blur-xl backdrop-saturate-150"
    >
      <nav
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4
        sm:px-6"
      >
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1"
          >
            <span
              className="relative size-9 rounded-full bg-white shadow-sm ring-1 ring-black/5
              transition-transform duration-300 group-hover:scale-105"
            >
              <Image
                src="/logo.svg"
                alt="forgeai logo"
                fill
                className="object-contain p-1.5"
              />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-neutral-900">
              Forgeai
            </span>
          </Link>

          <div className="ml-4 hidden items-center gap-1 md:flex">
            {auth.isSignedIn && (
              <Link
                href="/projects"
                className="rounded-full px-3 py-1.5 text-sm text-neutral-600 transition-colors
                hover:bg-neutral-900/5 hover:text-neutral-900"
              >
                Projects
              </Link>
            )}
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-sm text-neutral-600 transition-colors
                hover:bg-neutral-900/5 hover:text-neutral-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {auth.isSignedIn ? (
            <UserButton showName />
          ) : (
            <SignInButton>
              <Button
                className="cursor-pointer rounded-full px-5 text-white shadow-sm transition-transform
                hover:scale-[1.02]"
              >
                Sign in
              </Button>
            </SignInButton>
          )}
        </div>
      </nav>
    </header>
  );
}
