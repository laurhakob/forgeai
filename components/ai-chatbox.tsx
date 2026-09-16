"use client";

import { FieldGroup } from "./ui/field";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "./ui/textarea";
import { useRef, useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  IconArrowUp,
  IconLoader2,
  IconPaperclip,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { Button } from "./ui/button";
import Image from "next/image";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { DEFAULT_PROMPTS } from "@/constants";
import { fetchRealtimeSubscriptionToken } from "@/app/actions/get-inngest-sub-token";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useClerk, Show } from "@clerk/nextjs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckoutButton } from "@clerk/nextjs/experimental";

interface Props {
  projectId?: string;
}

const messageSchema = z.object({
  message: z
    .string()
    .min(3, "Message is required")
    .max(1000, "Message is too long"),
});

// Eden Treaty reports failures on `res.error` instead of throwing, so an
// unchecked call fails silently. Pull the server's message out when it sent one.
const edenError = (
  error: { status: unknown; value: unknown },
  action: string,
) => {
  const { value } = error;

  if (typeof value === "object" && value !== null && "error" in value) {
    return String((value as { error: unknown }).error);
  }

  return `Could not ${action} (${String(error.status)})`;
};

export const AIChatbox = ({ projectId }: Props) => {
  const router = useRouter();
  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });
  const clerk = useClerk();

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const { startUpload, isUploading } = useUploadThing("designImageUploader");

  const fileRef = useRef<HTMLInputElement | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notificationsEnabled = Boolean(projectId);

  const { latestData } = useInngestSubscription({
    refreshToken: notificationsEnabled
      ? () => fetchRealtimeSubscriptionToken(projectId!)
      : undefined,
  });

  useEffect(() => {
    const message = latestData?.data;

    if (!message) return;

    setStatus(message);

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

    if (message === "Demo is ready") {
      router.refresh();

      clearTimerRef.current = setTimeout(() => setStatus(null), 5000);
    }

    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [latestData?.data, router]);

  const onSubmit = async ({ message }: z.infer<typeof messageSchema>) => {
    const cleanMessage = message.trim() ?? "";

    try {
      if (!cleanMessage && attachedFile) {
        toast.error("Type a message or upload an image");
        return;
      }

      const files = [attachedFile as File];

      let url = undefined;

      if (attachedFile) {
        const res = await startUpload(files);

        url = res?.[0]?.ufsUrl;
      }

      if (!clerk.isSignedIn) {
        clerk.openSignIn();
        return;
      }

      if (!projectId) {
        const res = await apiClient.projects.post({
          message: cleanMessage,
          imageUrl: url,
        });

        if (res.error) throw new Error(edenError(res.error, "create project"));

        // `status(...)` bails widen the union with a raw `Response`.
        const project =
          res.data && "id" in res.data ? res.data : null;

        if (!project) throw new Error("Could not create project");

        router.push(`/projects/${project.id}`);
        return;
      }

      const res = await apiClient.messages.post({
        message: cleanMessage,
        projectId,
        imageUrl: url,
      });

      if (res.error) throw new Error(edenError(res.error, "send message"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      form.reset();
      setAttachedFile(null);
      setImagePreview("");
      router.refresh();
    }
  };

  // Checkout only updates Clerk's servers. The session token still carries the
  // old plan/feature claims, so <Show> and <PricingTable> keep rendering the
  // previous plan until the session is reloaded.
  const refreshBillingState = async () => {
    clerk.session?.clearCache();
    await clerk.session?.reload();
    router.refresh();
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] as File;

    if (!file.type.startsWith("image/")) {
      toast.error("Only images upload are supported");
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImagePreview(reader.result as string);
    };

    reader.readAsDataURL(file);

    setImagePreview(reader.result as string);
    setAttachedFile(file);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      await form.handleSubmit(onSubmit)(e);

      form.reset();
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    setImagePreview("");
  };

  const onSelect = (message: string) => {
    form.setValue("message", message, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="mx-auto flex flex-col w-full gap-4">
      <div className="relative z-10 flex flex-col w-full mx-auto content-center">
        {status && (
          <div className="font-medium text-sm px-2 py-6 shimmer-text tracking-wider">
            {status}
          </div>
        )}
        <form
          className="overflow-visible rounded-2xl border border-black/[0.07] bg-white p-3 shadow-sm
          transition-shadow duration-300 focus-within:border-indigo-300/70
          focus-within:shadow-[0_0_0_4px_rgba(99,102,241,0.09)]"
          id="message-form"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {imagePreview && attachedFile && (
            <div className="relative flex items-center w-fit gap-2 mb-2 overflow-hidden">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <Image
                  alt={attachedFile.name}
                  src={imagePreview}
                  fill
                  className="object-cover"
                />
              </div>
              <button
                className="absolute z-10 rounded-full shadow-2xl right-0 top-0 bg-[#f7f4ee] p-1 cursor-pointer"
                type="button"
                onClick={removeFile}
              >
                <IconX size={16} />
              </button>
            </div>
          )}
          <FieldGroup>
            <Controller
              name="message"
              control={form.control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  className="max-h-50 min-h-16 resize-none rounded-none border-none bg-transparent! 
                  p-0 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
                  placeholder={
                    projectId
                      ? "Ask Forgeai for a change…"
                      : "Describe the app you want to build, or attach a screenshot…"
                  }
                  onKeyDown={handleKeyDown}
                />
              )}
            />
          </FieldGroup>

          <div className="flex items-center gap-1">
            <div className="flex items-end gap-0.5 sm:gap-1">
              <input
                type="file"
                className="sr-only"
                onChange={handleSelectFile}
                ref={fileRef}
                
              />

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="-ml-0.5 flex h-8 w-8 cursor-pointer items-center justify-center
                  rounded-full text-neutral-500 transition-colors hover:bg-neutral-900/5
                  hover:text-neutral-900"
                  type="button"
                  suppressHydrationWarning
                >
                  <IconPlus size={16} />
                </DropdownMenuTrigger>

                <DropdownMenuContent className="space-y-1">
                  <Show
                    when={{ feature: "screenshot_upload" }}
                    fallback={
                      <DropdownMenuItem
                        className="rounded-[calc(1rem-6px)] text-xs"
                        onClick={() => setIsOpen(true)}
                      >
                        <div className="flex items-center gap-2 cursor-pointer">
                          <IconPaperclip
                            className="text-muted-foreground"
                            size={16}
                          />
                          <span>Attach file</span>
                        </div>
                      </DropdownMenuItem>
                    }
                  >
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => fileRef.current?.click()}
                    >
                      <div className="flex items-center gap-2 cursor-pointer">
                        <IconPaperclip
                          className="text-muted-foreground"
                          size={16}
                        />
                        <span>Attach file</span>
                      </div>
                    </DropdownMenuItem>
                  </Show>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <Button
                className="size-8 cursor-pointer rounded-full shadow-md transition-transform
                hover:scale-105 disabled:opacity-40 disabled:shadow-none"
                size="icon"
                type="submit"
                variant="default"
                form="message-form"
                disabled={
                  form.formState.isSubmitting ||
                  isUploading ||
                  !form.formState.isValid
                }
              >
                {form.formState.isSubmitting || isUploading ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconArrowUp size={16} className="text-white" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {!projectId && (
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2 px-1 pb-1">
          {DEFAULT_PROMPTS.map((p) => (
            <Button
              key={p.title}
              onClick={() => onSelect(p.prompt)}
              variant="outline"
              size="sm"
              className="cursor-pointer rounded-full border-black/[0.07] bg-white/70 text-neutral-700
              shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white
              hover:text-neutral-900"
            >
              {p.emoji} {p.title}
            </Button>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrad to pro</DialogTitle>
            <DialogDescription>
              Upgrad to pro to access screenshot upload and inline code edit
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <CheckoutButton
              planId="cplan_3JMTRdNhGzlNMdZnkE1S4OoOFWX"
              planPeriod="month"
              onSubscriptionComplete={refreshBillingState}
            >
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white"
              >
                Upgrad to pro
              </Button>
            </CheckoutButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

