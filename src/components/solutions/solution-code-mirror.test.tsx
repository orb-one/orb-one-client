import { java } from '@codemirror/lang-java'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

const loadSolutionCodeLanguage = vi.hoisted(() => vi.fn())

vi.mock('@/lib/solutions/solution-code-language', () => ({
  loadSolutionCodeLanguage,
}))

import { SolutionCodeMirror } from '@/components/solutions/solution-code-mirror'

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('clears stale highlighting while the latest language is loading or fails', async () => {
  const pythonLanguage = deferred<ReturnType<typeof java> | undefined>()
  const rubyLanguage = deferred<ReturnType<typeof java> | undefined>()

  loadSolutionCodeLanguage.mockImplementation((language: string | null) => {
    if (language === 'Java') {
      return Promise.resolve(java())
    }

    if (language === 'Python') {
      return pythonLanguage.promise
    }

    return rubyLanguage.promise
  })

  const { container, rerender } = render(
    <SolutionCodeMirror
      value="public class Main {}"
      language="Java"
      ariaLabel="Source code"
    />,
  )

  await waitFor(() => {
    expect(
      container.querySelector('.solution-code-syntax-keyword'),
    ).toBeInTheDocument()
  })

  rerender(
    <SolutionCodeMirror
      value="public class Main {}"
      language="Python"
      ariaLabel="Source code"
    />,
  )

  expect(
    container.querySelector('.solution-code-syntax-keyword'),
  ).not.toBeInTheDocument()

  rerender(
    <SolutionCodeMirror
      value="public class Main {}"
      language="Ruby"
      ariaLabel="Source code"
    />,
  )

  await act(async () => {
    pythonLanguage.resolve(java())
    await pythonLanguage.promise
  })

  expect(
    container.querySelector('.solution-code-syntax-keyword'),
  ).not.toBeInTheDocument()

  await act(async () => {
    rubyLanguage.reject(new Error('Language failed to load'))

    try {
      await rubyLanguage.promise
    } catch {
      // The component intentionally falls back to plain text.
    }
  })

  expect(
    container.querySelector('.solution-code-syntax-keyword'),
  ).not.toBeInTheDocument()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}
