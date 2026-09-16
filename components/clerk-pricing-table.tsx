"use client";

import { IconLoader2 } from "@tabler/icons-react";
import dynamic from "next/dynamic";

const PricingTableNoSSR = dynamic(
  () => import("@clerk/nextjs").then((c) => c.PricingTable),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-48 flex-col items-center justify-center gap-6">
        <IconLoader2 className="size-8 animate-spin text-neutral-400" />
      </div>
    ),
  },
);

export default function ClerkPricingTable() {
  return (
    <div
      className="flex w-full scroll-mt-24 flex-col gap-10"
      suppressHydrationWarning
      id="pricing"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-xs font-semibold tracking-[0.18em] text-indigo-600 uppercase">
          Pricing
        </span>
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Choose a plan that suits your needs
        </h2>
        <p className="max-w-xl text-balance text-sm leading-relaxed text-neutral-600 sm:text-base">
          Start for free. Pay as you go — upgrade only when you need screenshot
          uploads and inline code editing.
        </p>
      </div>

      <PricingTableNoSSR
        appearance={{
          elements: {
            pricingTableCard: "!shadow-[0_18px_50px_-30px_rgba(20,20,43,0.5)] !rounded-2xl",
            pricingTableCardFeatures: "!border-none",
            pricingTableCardFooter: "!border-none",
          },
        }}
      />
    </div>
  );
}
