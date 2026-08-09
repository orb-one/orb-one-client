import '@testing-library/jest-dom/vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => undefined,
})

class ResizeObserverMock implements ResizeObserver {
  observe() {
    return undefined
  }

  unobserve() {
    return undefined
  }

  disconnect() {
    return undefined
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
})

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: () => null,
})

Object.defineProperty(Range.prototype, 'getClientRects', {
  writable: true,
  value: () => [],
})

Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
  writable: true,
  value: () => new DOMRect(),
})

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  writable: true,
  value(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  },
})

Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  writable: true,
  value(this: HTMLDialogElement) {
    this.removeAttribute('open')
  },
})
