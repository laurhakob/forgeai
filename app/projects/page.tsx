import Link from "next/link";
import { headers } from "next/headers";
import { formatDistanceToNow } from "date-fns";
import { IconArrowRight, IconPlus, IconSparkles } from "@tabler/icons-react";
import { NavMenu } from "@/components/nav-menu";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { Button } from "@/components/ui/button";
import { getApiClient } from "@/lib/api-client";

// Each card gets a stable colourway derived from its position, so the grid
// reads as a set rather than six identical grey tiles.
const SWATCHES = [
  "from-indigo-500 via-violet-500 to-fuchsia-500",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-emerald-400 via-teal-500 to-cyan-500",
  "from-sky-400 via-blue-500 to-indigo-500",
  "from-rose-400 via-pink-500 to-purple-500",
  "from-lime-400 via-emerald-500 to-teal-500",
] as const;

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const requestHeaders = await headers();

  const apiClient = getApiClient(requestHeaders);

  const { data } = await apiClient.projects.get();

  // `status(...)` bails widen the union with a raw `Response`.
  const projects = Array.isArray(data) ? data : [];

  return (
    <div className="relative min-h-dvh overflow-x-clip antialiased">
      {/* Carries the page background too — see the note in (main)/layout.tsx. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[#fcfbf8]"
      >
        <div className="bg-grid mask-radial-fade absolute inset-0" />
        <div
          className="animate-drift absolute -top-48 left-1/2 h-[28rem] w-[46rem] -translate-x-1/2
          rounded-full bg-indigo-400/15 blur-[120px]"
        />
      </div>

      <NavMenu />

      <main className="mx-auto w-full max-w-6xl px-6 pt-12 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="animate-rise flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[0.18em] text-indigo-600 uppercase">
              Workspace
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              Your projects
            </h1>
            <p className="text-sm text-neutral-600">
              {projects.length > 0
                ? `${projects.length} ${projects.length === 1 ? "project" : "projects"} · pick up where you left off`
                : "Nothing here yet — your first build is one prompt away."}
            </p>
          </div>

          <Link href="/" className="animate-rise [animation-delay:80ms]">
            <Button
              className="cursor-pointer rounded-full px-5 text-white shadow-md transition-transform
              hover:scale-[1.02]"
            >
              <IconPlus size={16} />
              New project
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, i) => (
              <li
                key={project.id}
                className="animate-rise group relative overflow-hidden rounded-2xl border
                border-black/[0.07] bg-white/80 shadow-sm backdrop-blur-sm transition-all
                duration-300 hover:-translate-y-1
                hover:shadow-[0_22px_50px_-28px_rgba(20,20,43,0.5)]"
                style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
              >
                {/* The card body is the link; the delete control sits above it
                    so an anchor never wraps a button. */}
                <Link href={`/projects/${project.id}`} className="block">
                  <div
                    className={`relative h-28 bg-gradient-to-br ${SWATCHES[i % SWATCHES.length]}`}
                  >
                    <div className="bg-grid absolute inset-0 opacity-25 mix-blend-overlay" />
                    <span
                      className="absolute bottom-3 left-4 flex size-9 items-center justify-center
                      rounded-xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-md"
                    >
                      <IconSparkles size={18} stroke={1.75} />
                    </span>
                  </div>

                  <div className="p-5 pr-14">
                    <h2 className="truncate text-sm font-semibold text-neutral-900">
                      {project.name}
                    </h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      Updated{" "}
                      {formatDistanceToNow(new Date(project.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>

                    <span
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600
                      opacity-0 transition-all duration-300 group-hover:translate-x-0.5
                      group-hover:opacity-100"
                    >
                      Open project
                      <IconArrowRight size={14} />
                    </span>
                  </div>
                </Link>

                <div className="absolute right-3 bottom-4">
                  <DeleteProjectButton
                    projectId={project.id}
                    projectName={project.name}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="animate-rise mt-12 flex flex-col items-center gap-5 rounded-3xl border border-dashed
      border-black/[0.1] bg-white/60 px-6 py-20 text-center backdrop-blur-sm [animation-delay:120ms]"
    >
      <span
        className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br
        from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25"
      >
        <IconSparkles size={24} stroke={1.75} />
      </span>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-neutral-900">
          No projects yet
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-neutral-600">
          Describe an app or drop in a screenshot, and Forgeai will build it,
          run it, and hand you the code.
        </p>
      </div>

      <Link href="/">
        <Button className="cursor-pointer rounded-full px-5 text-white shadow-md">
          Start building
          <IconArrowRight size={16} />
        </Button>
      </Link>
    </div>
  );
}
