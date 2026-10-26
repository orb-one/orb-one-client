import { Dialog } from '@astryxdesign/core/Dialog'
import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { cleanup, render } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

function dialogPair(firstOpen: boolean, secondOpen: boolean) {
  return (
    <>
      <Dialog isOpen={firstOpen} onOpenChange={() => undefined}>
        첫 모달
      </Dialog>
      <Dialog isOpen={secondOpen} onOpenChange={() => undefined}>
        두 번째 모달
      </Dialog>
    </>
  )
}

function renderDialogs(children: ReactNode) {
  return render(children, {
    wrapper: ({ children }) => (
      <StrictMode>
        <Theme theme={neutralTheme} mode="light">
          <LayerProvider>{children}</LayerProvider>
        </Theme>
      </StrictMode>
    ),
  })
}

it.each(['first', 'second'] as const)(
  'keeps body locked until the last dialog closes when %s closes first',
  (firstToClose) => {
    const originalStyle = document.body.getAttribute('style')
    document.body.removeAttribute('style')
    try {
      const { rerender } = renderDialogs(dialogPair(true, true))
      rerender(dialogPair(firstToClose !== 'first', firstToClose !== 'second'))
      expect(document.body.style.position).toBe('fixed')
      expect(document.body.style.overflow).toBe('hidden')
      rerender(dialogPair(false, false))
      expect(document.body.style.position).toBe('')
      expect(document.body.style.overflow).toBe('')
    } finally {
      cleanup()
      if (originalStyle === null) document.body.removeAttribute('style')
      else document.body.setAttribute('style', originalStyle)
    }
  },
)

it('restores the scroll offset captured before the first dialog opened', () => {
  const scrollXDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollX')
  const scrollYDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollY')
  const originalStyle = document.body.getAttribute('style')
  const scrollTo = vi.spyOn(window, 'scrollTo')
  try {
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 17 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 })
    const { rerender, unmount } = renderDialogs(dialogPair(true, false))
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 0 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    rerender(dialogPair(true, true))
    unmount()
    expect(scrollTo).toHaveBeenLastCalledWith(17, 120)
  } finally {
    cleanup()
    scrollTo.mockRestore()
    if (scrollXDescriptor)
      Object.defineProperty(window, 'scrollX', scrollXDescriptor)
    if (scrollYDescriptor)
      Object.defineProperty(window, 'scrollY', scrollYDescriptor)
    if (originalStyle === null) document.body.removeAttribute('style')
    else document.body.setAttribute('style', originalStyle)
  }
})
