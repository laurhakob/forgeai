import Image from "next/image";
import Link from "next/link";
import { NavMenu } from "@/components/nav-menu";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-dvh overflow-x-clip antialiased">
      {/* Decorative only — pinned behind every surface and never interactive.
          It also carries the page background: a `-z-10` child paints behind its
          parent's own background, so tinting the wrapper would hide all of it. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[#fcfbf8]"
      >
        <div className="bg-grid mask-radial-fade absolute inset-0" />
        <div
          className="animate-drift absolute -top-40 left-1/2 h-[34rem] w-[52rem] -translate-x-1/2
          rounded-full bg-indigo-400/20 blur-[130px]"
        />
        <div
          className="animate-drift absolute -top-20 right-[8%] h-[24rem] w-[24rem] rounded-full
          bg-fuchsia-400/14 blur-[120px] [animation-delay:-5s]"
        />
        <div
          className="animate-drift absolute top-24 left-[6%] h-[22rem] w-[22rem] rounded-full
          bg-amber-300/16 blur-[120px] [animation-delay:-9s]"
        />
      </div>

      <main className="flex min-h-dvh flex-col">
        <NavMenu />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </main>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-black/[0.06]">
      <div
        className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6
        py-10 sm:flex-row"
      >
        <div className="flex items-center gap-2.5">
          <span className="relative size-7 rounded-full bg-white shadow-sm ring-1 ring-black/5">
            <Image
              src="/logo.svg"
              alt="forgeai logo"
              fill
              className="object-contain p-1"
            />
          </span>
          <span className="text-sm font-medium text-neutral-800">Forgeai</span>
          <span className="text-sm text-neutral-400">
            — from idea to app, in one prompt.
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-neutral-500">
          <Link href="/#features" className="transition-colors hover:text-neutral-900">
            Features
          </Link>
          <Link href="/#pricing" className="transition-colors hover:text-neutral-900">
            Pricing
          </Link>
          <Link href="/projects" className="transition-colors hover:text-neutral-900">
            Projects
          </Link>
        </div>
      </div>
    </footer>
  );
}
