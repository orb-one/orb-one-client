import { FieldLabel } from '@astryxdesign/core/Field'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { Selector } from '@astryxdesign/core/Selector'
import { TextInput } from '@astryxdesign/core/TextInput'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers'
import { useAppStore } from '@/stores/use-app-store'

afterEach(() => {
  cleanup()
  useAppStore.getState().setLocale('ko')
})

it('updates shared field indicators with the app locale and preserves required semantics', () => {
  render(
    <AppProviders>
      <TextInput label="Title" value="Draft" isRequired />
      <Selector label="Platform" options={['BOJ']} value="BOJ" isRequired />
      <TextInput label="URL" value="" isOptional />
      <NumberInput
        label="Memory"
        value={null}
        onChange={vi.fn()}
        hasClear
        isOptional
      />
    </AppProviders>,
  )

  const title = screen.getByRole('textbox', { name: /Title.*필수/ })
  const platform = screen.getByRole('combobox', { name: /Platform.*필수/ })
  const url = screen.getByRole('textbox', { name: /URL.*선택/ })
  const memory = screen.getByRole('spinbutton', { name: /Memory.*선택/ })

  expect(title).toHaveAttribute('aria-required', 'true')
  expect(platform).toHaveAttribute('aria-required', 'true')
  expect(url).not.toHaveAttribute('aria-required')
  expect(memory).not.toHaveAttribute('aria-required')
  expect(screen.queryByText('Required')).not.toBeInTheDocument()
  expect(screen.queryByText('Optional')).not.toBeInTheDocument()

  act(() => {
    useAppStore.getState().setLocale('en')
  })

  expect(title).toHaveAccessibleName(/Title.*Required/)
  expect(platform).toHaveAccessibleName(/Platform.*Required/)
  expect(url).toHaveAccessibleName(/URL.*Optional/)
  expect(memory).toHaveAccessibleName(/Memory.*Optional/)
  expect(title).toHaveValue('Draft')
  expect(title).toHaveAttribute('aria-required', 'true')
  expect(platform).toHaveAttribute('aria-required', 'true')

  act(() => {
    useAppStore.getState().setLocale('ko')
  })

  expect(title).toHaveAccessibleName(/Title.*필수/)
  expect(url).toHaveAccessibleName(/URL.*선택/)
  expect(screen.getAllByText(/필수/)).toHaveLength(2)
  expect(screen.getAllByText(/선택/)).toHaveLength(2)
})

it('keeps Astryx default indicators when no provider is configured', () => {
  render(<FieldLabel label="Title" inputID="title" isRequired />)

  expect(screen.getByText(/Required/)).toBeVisible()
})
