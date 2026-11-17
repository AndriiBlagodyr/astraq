"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  dropIndex,
  moveItem,
  reorderAnnouncement,
  sameOrder,
  stepIndex,
} from "./reorder";

/** A row being moved: by the pointer, or lifted with the keyboard. */
export type ReorderDrag = {
  id: string;
  /** The preview order, shown while the drag lasts. */
  order: string[];
  mode: "pointer" | "keyboard";
};

/**
 * Reordering a list of rows by their grips (motion plan "Drag to reorder").
 * The geometry and the moves are the pure functions in lib/reorder.ts; this
 * wires pointer and keyboard events to them and keeps the preview order
 * while a drag lasts.
 *
 * - Pointer: the grip starts a drag and the rows make way as the pointer
 *   passes their midpoints.
 * - Keyboard: Space or Enter lifts the row, the arrows move it, Space drops
 *   it, Escape puts it back, and so does leaving the grip. Each step is in
 *   `announcement`, for a live region.
 *
 * Both end in `onCommit` with the whole new order, and only when it differs
 * from `order`. Ids double as the names read out, so pass something a
 * person would recognize (a ticker).
 *
 * The caller spreads `bodyProps` on the element that holds the rows, puts
 * `rowRef(id)` on each row and `gripProps(id)` on its grip
 * button, and renders the rows in the returned `order`.
 */
export function useReorder<Body extends HTMLElement = HTMLElement>({
  order,
  onCommit,
}: {
  order: string[];
  onCommit: (order: string[]) => void;
}) {
  const [drag, setDrag] = useState<ReorderDrag | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const gripRefs = useRef(new Map<string, HTMLElement>());
  const bodyRef = useRef<Body | null>(null);

  // A row that moves down is re-inserted in the DOM (see the pointer notes
  // below), and an element taken out of the document loses focus. For a row
  // lifted with the keyboard that would end the move at the first ArrowDown:
  // the next key press would go nowhere. So after every step the lifted
  // row's grip takes focus back, before the browser paints.
  const liftedId = drag?.mode === "keyboard" ? drag.id : null;
  const liftedOrder = drag?.mode === "keyboard" ? drag.order : null;
  useLayoutEffect(() => {
    if (liftedId === null) return;
    const grip = gripRefs.current.get(liftedId);
    if (grip && document.activeElement !== grip) grip.focus();
  }, [liftedId, liftedOrder]);

  // What `onBlur` checks a moment later: is this row still the lifted one?
  const liftedRef = useRef<string | null>(null);
  useEffect(() => {
    liftedRef.current = liftedId;
  }, [liftedId]);

  function commit(next: string[]) {
    if (!sameOrder(next, order)) onCommit(next);
  }

  // Pointer drag: the body captures the pointer, so moves keep arriving
  // wherever it goes; the row under the pointer is found from the rows'
  // on-screen midpoints in their preview order. The body and not the grip,
  // because a row that moves down is re-inserted in the DOM, and an element
  // taken out of the document, even for an instant, loses its capture: the
  // drag would end at the first swap. The body never moves.
  function onPointerDown(event: PointerEvent<HTMLElement>, id: string) {
    if (event.button !== 0 || drag || !bodyRef.current) return;
    event.preventDefault();
    bodyRef.current.setPointerCapture(event.pointerId);
    setDrag({ id, order, mode: "pointer" });
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!drag || drag.mode !== "pointer") return;
    const midpoints = drag.order.map((id) => {
      const rect = rowRefs.current.get(id)?.getBoundingClientRect();
      return rect ? rect.top + rect.height / 2 : Number.NaN;
    });
    const from = drag.order.indexOf(drag.id);
    const to = dropIndex(midpoints, from, event.clientY);
    if (to !== from)
      setDrag({ ...drag, order: moveItem(drag.order, from, to) });
  }

  function onPointerUp() {
    if (!drag || drag.mode !== "pointer") return;
    setDrag(null);
    commit(drag.order);
  }

  function onPointerCancel() {
    if (drag?.mode === "pointer") setDrag(null);
  }

  // Keyboard: Space lifts and drops, arrows move the lifted row, Escape
  // cancels, and losing focus while lifted cancels too.
  function onKeyDown(event: KeyboardEvent<HTMLElement>, id: string) {
    const count = order.length;
    const lifted = drag?.mode === "keyboard" && drag.id === id;

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!lifted) {
        setDrag({ id, order, mode: "keyboard" });
        setAnnouncement(
          reorderAnnouncement({
            kind: "lift",
            label: id,
            position: order.indexOf(id) + 1,
            count,
          })
        );
        return;
      }
      setDrag(null);
      setAnnouncement(
        reorderAnnouncement({
          kind: "drop",
          label: id,
          position: drag.order.indexOf(id) + 1,
          count,
        })
      );
      commit(drag.order);
      return;
    }

    if (!lifted) return;

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const from = drag.order.indexOf(id);
      const to = stepIndex(from, event.key === "ArrowUp" ? -1 : 1, count);
      if (to === from) return;
      setDrag({ ...drag, order: moveItem(drag.order, from, to) });
      setAnnouncement(
        reorderAnnouncement({ kind: "move", label: id, position: to + 1, count })
      );
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setDrag(null);
      setAnnouncement(reorderAnnouncement({ kind: "cancel", label: id }));
    }
  }

  // Losing focus cancels the lift, but not the blur a move itself causes
  // (the re-insertion above): by the next task the effect has put focus
  // back, and only a blur that stuck means the user went elsewhere.
  function onBlur(id: string) {
    if (drag?.mode !== "keyboard" || drag.id !== id) return;
    setTimeout(() => {
      if (liftedRef.current !== id) return;
      if (document.activeElement === gripRefs.current.get(id)) return;
      setDrag(null);
      setAnnouncement(reorderAnnouncement({ kind: "cancel", label: id }));
    }, 0);
  }

  const keep =
    (refs: { current: Map<string, HTMLElement> }, id: string) =>
    (node: HTMLElement | null) => {
      if (node) refs.current.set(id, node);
      else refs.current.delete(id);
    };

  return {
    /** The order to render: the preview while a drag lasts. */
    order: drag ? drag.order : order,
    /** The id being moved, if any. */
    draggingId: drag?.id ?? null,
    /** The text of the last keyboard step, for an `aria-live` region. */
    announcement,
    bodyProps: {
      // A callback, not the ref object: a hook's result is read during
      // render, and a ref object in it would make every read look like one
      // of the ref's value.
      ref: (node: Body | null) => {
        bodyRef.current = node;
      },
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture: onPointerCancel,
    },
    rowRef: (id: string) => keep(rowRefs, id),
    gripProps: (id: string) => ({
      ref: keep(gripRefs, id),
      "aria-pressed":
        drag?.mode === "keyboard" && drag.id === id ? true : undefined,
      onPointerDown: (event: PointerEvent<HTMLElement>) =>
        onPointerDown(event, id),
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => onKeyDown(event, id),
      onBlur: () => onBlur(id),
    }),
  };
}
