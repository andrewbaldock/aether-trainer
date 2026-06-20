import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

// Own a localStorage stub rather than relying on jsdom — jsdom's storage has
// been flaky (the recurring "undefined.clear" issue). A simple Map-backed
// implementation is deterministic and resettable between tests.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

// React Flow uses ResizeObserver + DOMMatrix, which jsdom doesn't implement.
// Stub them so components that mount the canvas render in tests (the browser
// has the real APIs — verified by the dev server loading fine).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  if (!("DOMMatrixReadOnly" in globalThis)) {
    vi.stubGlobal(
      "DOMMatrixReadOnly",
      class {
        m22 = 1;
        constructor(_t?: string) {}
      },
    );
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});
