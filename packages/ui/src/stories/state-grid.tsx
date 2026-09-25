import type { ReactNode } from "react";

/**
 * Rows of forced interaction states for review. Pair with the story parameter
 * from `pseudoStates` so storybook-addon-pseudo-states applies :hover etc. to
 * each row by id.
 */
export const STATE_ROWS = [
  { id: "state-default", label: "Default" },
  { id: "state-hover", label: "Hover" },
  { id: "state-focus", label: "Focus visible" },
  { id: "state-active", label: "Active" },
] as const;

/** Forces states on `target` elements inside each row, not on the row itself. */
export function pseudoStatesFor(target: string) {
  return {
    pseudo: {
      hover: [`#state-hover ${target}`],
      focusVisible: [`#state-focus ${target}`],
      active: [`#state-active ${target}`],
    },
  };
}

export const pseudoStates = pseudoStatesFor("*");

export function StateGrid({
  children,
  extraRows = [],
}: {
  children: (rowId: string) => ReactNode;
  extraRows?: { id: string; label: string; content: ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-center gap-x-6 gap-y-4">
      {STATE_ROWS.map((row) => (
        <StateRow key={row.id} label={row.label}>
          <div id={row.id} className="flex flex-wrap items-center gap-3">
            {children(row.id)}
          </div>
        </StateRow>
      ))}
      {extraRows.map((row) => (
        <StateRow key={row.id} label={row.label}>
          <div className="flex flex-wrap items-center gap-3">{row.content}</div>
        </StateRow>
      ))}
    </div>
  );
}

function StateRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="text-xs font-semibold tracking-widest text-muted uppercase">
        {label}
      </span>
      {children}
    </>
  );
}
