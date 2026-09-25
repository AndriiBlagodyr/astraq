import "@testing-library/jest-dom/vitest";

// Node 22+ ships an experimental global `localStorage` that shadows jsdom's and
// is undefined unless Node runs with --localstorage-file. Swap in an in-memory
// Storage so tests behave the same on every Node version.
if (typeof globalThis.localStorage?.clear !== "function") {
  class MemoryStorage implements Storage {
    #items = new Map<string, string>();

    get length() {
      return this.#items.size;
    }

    clear() {
      this.#items.clear();
    }

    getItem(key: string) {
      return this.#items.get(key) ?? null;
    }

    key(index: number) {
      return [...this.#items.keys()][index] ?? null;
    }

    removeItem(key: string) {
      this.#items.delete(key);
    }

    setItem(key: string, value: string) {
      this.#items.set(key, String(value));
    }
  }

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
}

// jsdom gaps that floating overlays (Select, Tooltip) rely on.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// Skipped for tests that opt into the Node environment.
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}
