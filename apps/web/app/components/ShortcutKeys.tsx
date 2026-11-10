import { Kbd, KbdGroup } from "@astraq/ui";
import { keyLabels, type ShortcutKey } from "@/lib/shortcuts";

type ShortcutKeysProps = {
  keys: readonly ShortcutKey[];
  /** Whether to show ⌘ (Apple) or Ctrl. */
  apple: boolean;
  size?: "sm" | "md";
  className?: string;
};

/** A shortcut's keys as Kbd chips, for palette rows, the overlay, and the trigger. */
export function ShortcutKeys({
  keys,
  apple,
  size = "sm",
  className,
}: ShortcutKeysProps) {
  const labels = keyLabels(keys, { apple });
  return (
    <KbdGroup className={className}>
      {labels.map((label, index) => (
        <Kbd key={`${label}-${index}`} size={size}>
          {label === "⌘" ? (
            <>
              <span aria-hidden="true">⌘</span>
              <span className="sr-only">Command</span>
            </>
          ) : (
            label
          )}
        </Kbd>
      ))}
    </KbdGroup>
  );
}
