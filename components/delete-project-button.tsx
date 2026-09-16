"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  projectId: string;
  projectName: string;
}

export const DeleteProjectButton = ({ projectId, projectName }: Props) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  const onDelete = async () => {
    setIsDeleting(true);

    try {
      const res = await apiClient.projects({ projectId }).delete();

      if (res.error) {
        const { value } = res.error;

        throw new Error(
          typeof value === "object" && value !== null && "error" in value
            ? String((value as { error: unknown }).error)
            : `Could not delete project (${String(res.error.status)})`,
        );
      }

      toast.success(`Deleted "${projectName}"`);
      setIsOpen(false);
      startRefresh(() => router.refresh());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete project",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const isBusy = isDeleting || isRefreshing;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-7 cursor-pointer text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${projectName}`}
          >
            <IconTrash size={16} />
          </Button>
        }
      />

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{projectName}&quot; and all of its messages will be permanently
            deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onDelete}
            disabled={isBusy}
            className="cursor-pointer"
          >
            {isBusy ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
