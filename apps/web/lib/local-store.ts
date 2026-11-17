// A localStorage key as an external store for `useSyncExternalStore`: the
// server snapshot is empty, the browser's is the stored string (a stable
// primitive, so React can compare it), and a write notifies this tab with
// an event, since `storage` only fires in the others. Storage can be
// missing or full (private mode), and everything kept here is a
// convenience, so both directions fail quietly.

export type LocalStore = {
  subscribe: (onChange: () => void) => () => void;
  /** The stored string, or "" when there is none or storage is unavailable. */
  read: () => string;
  /** The server's snapshot: always empty. */
  readOnServer: () => string;
  write: (value: unknown) => void;
};

export function createLocalStore(key: string): LocalStore {
  const changeEvent = `${key}-change`;
  return {
    subscribe(onChange) {
      window.addEventListener("storage", onChange);
      window.addEventListener(changeEvent, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(changeEvent, onChange);
      };
    },
    read() {
      try {
        return window.localStorage.getItem(key) ?? "";
      } catch {
        return "";
      }
    },
    readOnServer: () => "",
    write(value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new Event(changeEvent));
      } catch {
        // Private mode or a full store.
      }
    },
  };
}
