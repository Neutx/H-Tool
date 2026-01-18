import { toast } from "sonner";

interface UndoDeleteOptions {
  itemName: string;
  onUndo: () => Promise<void>;
  duration?: number; // in milliseconds
}

/**
 * Global undo delete system
 * Shows a toast notification with undo button in bottom-left
 */
export function showUndoDeleteToast({
  itemName,
  onUndo,
  duration = 5000,
}: UndoDeleteOptions) {
  let undoClicked = false;

  toast.success(`${itemName} deleted`, {
    duration,
    position: "bottom-left",
    action: {
      label: "Undo",
      onClick: async () => {
        undoClicked = true;
        await onUndo();
        toast.success(`${itemName} restored`, {
          position: "bottom-left",
          duration: 3000,
        });
      },
    },
    onDismiss: () => {
      if (!undoClicked) {
        // Permanently deleted after toast disappears
        console.log(`${itemName} permanently deleted`);
      }
    },
    onAutoClose: () => {
      if (!undoClicked) {
        console.log(`${itemName} auto-closed, permanently deleted`);
      }
    },
  });
}

