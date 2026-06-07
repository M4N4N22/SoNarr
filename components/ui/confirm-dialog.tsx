"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "default",
  loading = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function handleConfirm() {
    await onConfirm();
  }

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed top-1/2 left-1/2 w-[min(100vw-2rem,28rem)] -translate-x-1/2 -translate-y-1/2",
        "rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-xl",
        "backdrop:bg-black/70 open:animate-in open:fade-in-0",
      )}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => onOpenChange(false)}
    >
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {children ? <div className="max-h-[50vh] overflow-y-auto px-4 py-3">{children}</div> : null}

      <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => onOpenChange(false)}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={loading}
          className={confirmVariant === "destructive" ? "bg-destructive hover:bg-destructive/90" : undefined}
          onClick={() => void handleConfirm()}
        >
          {loading ? "Please wait…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
