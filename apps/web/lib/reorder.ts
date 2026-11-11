// Reordering a list by drag or keyboard (motion plan "Drag to reorder",
// Phase 2 for watchlists). Pure, so the geometry and the moves are tested
// without a DOM; WatchlistItemsTable only wires events to them.

/** `items` with the element at `from` moved to `to`; the same array when nothing changes. */
export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number
): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/**
 * Where a row being dragged should sit, given the vertical midpoints of the
 * rows in their current order and the pointer's y. The dragged row takes
 * the place of the first row whose midpoint the pointer has passed: moving
 * down, it lands below a row once the pointer is below that row's middle;
 * moving up, above a row once it's above the row's middle. So a small
 * wobble around the row's own midpoint never swaps anything.
 */
export function dropIndex(
  midpoints: readonly number[],
  dragging: number,
  pointerY: number
): number {
  let target = dragging;
  if (midpoints.length === 0) return 0;
  // Downwards: the last row whose midpoint is above the pointer.
  for (let index = dragging + 1; index < midpoints.length; index++) {
    if (pointerY > midpoints[index]!) target = index;
    else break;
  }
  if (target !== dragging) return target;
  // Upwards: the first row whose midpoint is below the pointer.
  for (let index = dragging - 1; index >= 0; index--) {
    if (pointerY < midpoints[index]!) target = index;
    else break;
  }
  return target;
}

/** The index a keyboard move lands on, clamped to the list. */
export function stepIndex(index: number, by: -1 | 1, length: number): number {
  return Math.min(length - 1, Math.max(0, index + by));
}

/** The live-region text for each keyboard reordering step. */
export function reorderAnnouncement(
  event:
    | { kind: "lift"; label: string; position: number; count: number }
    | { kind: "move"; label: string; position: number; count: number }
    | { kind: "drop"; label: string; position: number; count: number }
    | { kind: "cancel"; label: string }
): string {
  switch (event.kind) {
    case "lift":
      return `${event.label} lifted, position ${event.position} of ${event.count}. Use the arrow keys to move it, Space to drop, Escape to cancel.`;
    case "move":
      return `${event.label} moved to position ${event.position} of ${event.count}.`;
    case "drop":
      return `${event.label} dropped at position ${event.position} of ${event.count}.`;
    case "cancel":
      return `${event.label} returned to its place.`;
  }
}
