import "@testing-library/jest-dom/vitest";

// Recharts measures its container, which jsdom cannot do. A stub keeps the
// charts renderable in tests without changing production behaviour.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
