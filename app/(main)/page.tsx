import {
  IconBolt,
  IconBrandGithub,
  IconCode,
  IconDeviceDesktop,
  IconPhoto,
  IconSparkles,
  IconTerminal2,
  IconWand,
} from "@tabler/icons-react";
import { AIChatbox } from "@/components/ai-chatbox";
import ClerkPricingTable from "@/components/clerk-pricing-table";

const STEPS = [
  {
    icon: IconPhoto,
    title: "Drop a design",
    body: "Upload a screenshot, a Figma export, or any reference image — or just describe what you have in mind.",
  },
  {
    icon: IconWand,
    title: "Agents build it",
    body: "Forgeai plans the screens, writes the components, wires the state, and installs whatever it needs.",
  },
  {
    icon: IconDeviceDesktop,
    title: "Ship it",
    body: "Preview the running app in a live sandbox, read every file, refine with a follow-up message.",
  },
] as const;

const FEATURES = [
  {
    icon: IconPhoto,
    title: "Pixel-accurate from images",
    body: "A design spec is extracted from your screenshot — spacing, palette, type scale — before a single line is generated.",
  },
  {
    icon: IconBolt,
    title: "Live sandbox previews",
    body: "Every build boots in an isolated sandbox, so you see the real app running instead of a static mock.",
  },
  {
    icon: IconCode,
    title: "Real code, not exports",
    body: "Browse the full file tree with syntax highlighting. It's ordinary Next.js and Tailwind you already know.",
  },
  {
    icon: IconSparkles,
    title: "Conversational refinement",
    body: "\"Make the hero darker.\" \"Add a filter bar.\" Each message edits the project in place and re-deploys.",
  },
  {
    icon: IconTerminal2,
    title: "Batteries included",
    body: "shadcn/ui, Tailwind, and the dependencies your app needs are installed and configured automatically.",
  },
  {
    icon: IconBrandGithub,
    title: "Yours to take",
    body: "Nothing is locked in. Read, copy, and run the generated project anywhere you host Next.js.",
  },
] as const;

export default async function Page() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-6 pt-16 pb-10 sm:pt-24">
        <div className="flex flex-col items-center gap-6 text-center">
          <span
            className="animate-rise inline-flex items-center gap-2 rounded-full border border-black/[0.07]
            bg-white/70 px-3.5 py-1.5 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur"
          >
            <IconSparkles size={14} className="text-indigo-500" />
            Screenshot to production app
          </span>

          <h1
            className="animate-rise text-balance text-4xl font-semibold leading-[1.08] tracking-tight
            text-neutral-900 [animation-delay:80ms] sm:text-6xl"
          >
            Build something{" "}
            <span className="text-gradient">great with Forgeai</span> that works
            the way you want.
          </h1>

          <p
            className="animate-rise max-w-xl text-balance text-base leading-relaxed text-neutral-600
            [animation-delay:160ms] sm:text-lg"
          >
            Upload a design image or screenshot, or simply chat — and get a
            production-ready, beautiful application back.
          </p>
        </div>

        <div className="animate-rise mt-10 [animation-delay:240ms]">
          <div
            className="rounded-[22px] bg-gradient-to-b from-white/70 to-white/20 p-1.5 shadow-[0_24px_70px_-32px_rgba(20,20,43,0.45)]
            ring-1 ring-black/[0.06] backdrop-blur-xl"
          >
            <AIChatbox />
          </div>
        </div>

        <p className="animate-rise mt-6 text-center text-xs text-neutral-500 [animation-delay:320ms]">
          Free to start · No credit card · Your first app in under a minute
        </p>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-20">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps, no setup"
          body="No boilerplate, no config files, no local environment. Describe it and watch it get built."
        />

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="group relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white/70
              p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1
              hover:shadow-[0_18px_40px_-24px_rgba(20,20,43,0.45)]"
            >
              <span
                className="absolute -top-6 -right-3 text-[6rem] font-semibold leading-none text-neutral-900/[0.035]
                select-none"
              >
                {i + 1}
              </span>

              <span
                className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br
                from-indigo-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/20"
              >
                <step.icon size={20} stroke={1.75} />
              </span>

              <h3 className="mt-5 text-base font-semibold text-neutral-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section
        id="features"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-20"
      >
        <SectionHeading
          eyebrow="Features"
          title="Everything the build needs"
          body="Forgeai handles the parts of app-building that usually eat the afternoon."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-black/[0.07] ring-1 ring-black/[0.07] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group bg-[#fdfcfa] p-7 transition-colors duration-300 hover:bg-white"
            >
              <span
                className="flex size-10 items-center justify-center rounded-lg border border-black/[0.07]
                bg-white text-indigo-600 shadow-sm transition-transform duration-300
                group-hover:-translate-y-0.5"
              >
                <feature.icon size={18} stroke={1.75} />
              </span>

              <h3 className="mt-5 text-sm font-semibold text-neutral-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-8">
        <ClerkPricingTable />
      </section>
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="text-xs font-semibold tracking-[0.18em] text-indigo-600 uppercase">
        {eyebrow}
      </span>
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
        {title}
      </h2>
      <p className="max-w-xl text-balance text-sm leading-relaxed text-neutral-600 sm:text-base">
        {body}
      </p>
    </div>
  );
}
