"use client";

import { Dialog, DialogContent } from "@astraq/ui";
import { shortcuts, type Shortcut } from "@/lib/shortcuts";
import { ShortcutKeys } from "./ShortcutKeys";

type ShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apple: boolean;
};

/**
 * The `?` overlay: every shortcut in lib/shortcuts.ts, grouped, as a
 * description list so a screen reader pairs each key with its action.
 */
export function ShortcutsDialog({
  open,
  onOpenChange,
  apple,
}: ShortcutsDialogProps) {
  const groups = Array.from(
    shortcuts.reduce((map, shortcut) => {
      map.set(shortcut.group, [...(map.get(shortcut.group) ?? []), shortcut]);
      return map;
    }, new Map<Shortcut["group"], Shortcut[]>())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Keyboard shortcuts"
        description="Single keys work anywhere outside a text field. Press the keys of a sequence one after the other."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {groups.map(([group, items]) => (
            <section key={group} className="grid content-start gap-2">
              <h3 className="m-0 text-xs font-semibold tracking-widest text-muted uppercase">
                {group}
              </h3>
              <dl className="m-0 grid gap-1.5">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <dt className="text-secondary">{shortcut.label}</dt>
                    <dd className="m-0">
                      <ShortcutKeys
                        keys={shortcut.keys}
                        apple={apple}
                        size="md"
                        className={shortcut.chord ? "gap-0.5" : undefined}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
