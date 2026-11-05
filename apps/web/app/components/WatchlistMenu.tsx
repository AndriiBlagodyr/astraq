"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  FormField,
  IconButton,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  useToastManager,
} from "@astraq/ui";
import {
  deleteWatchlist,
  renameWatchlist,
  restoreWatchlist,
} from "@/app/(app)/watchlists/actions";

type WatchlistMenuProps = {
  id: string;
  name: string;
  /** Where to go once this list is deleted; the index stays put. */
  afterDelete?: "index";
};

/**
 * Rename and delete for one watchlist, on the index rows and the detail
 * header. Delete is undoable from its toast (docs/ui-plan.md § Shared
 * patterns), so it needs no confirmation dialog; rename gets a small one.
 */
export function WatchlistMenu({ id, name, afterDelete }: WatchlistMenuProps) {
  const router = useRouter();
  const toast = useToastManager();
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteWatchlist(id);
      if (!result.ok) {
        toast.add({ title: result.error, type: "danger", priority: "high" });
        return;
      }
      if (afterDelete === "index") router.push("/watchlists");
      const snapshot = result.value;
      const toastId = toast.add({
        title: `Deleted ${snapshot.name}`,
        description:
          snapshot.tickers.length === 1
            ? "1 symbol"
            : `${snapshot.tickers.length} symbols`,
        timeout: 8000,
        actionProps: {
          children: "Undo",
          onClick: () => {
            toast.close(toastId);
            startTransition(async () => {
              const restored = await restoreWatchlist(snapshot);
              if (restored.ok) {
                toast.add({
                  title: `Restored ${snapshot.name}`,
                  type: "success",
                });
                router.refresh();
              } else {
                toast.add({
                  title: restored.error,
                  type: "danger",
                  priority: "high",
                });
              }
            });
          },
        },
      });
    });
  }

  function rename(formData: FormData) {
    const next = String(formData.get("name") ?? "");
    startTransition(async () => {
      const result = await renameWatchlist(id, next);
      if (result.ok) {
        setRenaming(false);
        setRenameError(null);
      } else {
        setRenameError(result.error);
      }
    });
  }

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <IconButton
              label={`Actions for ${name}`}
              variant="ghost"
              size="sm"
              loading={pending}
            >
              <MoreHorizontal aria-hidden="true" />
            </IconButton>
          }
        />
        <MenuContent align="end">
          <MenuItem onClick={() => setRenaming(true)}>
            <Pencil aria-hidden="true" />
            Rename
          </MenuItem>
          <MenuItem tone="danger" onClick={remove}>
            <Trash2 aria-hidden="true" />
            Delete
          </MenuItem>
        </MenuContent>
      </Menu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent title="Rename watchlist">
          <form action={rename} className="grid gap-4">
            <FormField label="Name" error={renameError}>
              <Input
                name="name"
                defaultValue={name}
                maxLength={64}
                required
                autoFocus
              />
            </FormField>
            <DialogFooter>
              <DialogClose render={<Button variant="secondary" />}>
                Cancel
              </DialogClose>
              <Button type="submit" loading={pending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
