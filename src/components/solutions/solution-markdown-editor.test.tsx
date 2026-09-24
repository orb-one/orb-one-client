import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, expect, it } from 'vitest'

import { SolutionMarkdownEditor } from '@/components/solutions/solution-markdown-editor'

afterEach(cleanup)

it('previews Markdown and preserves the source when returning to edit mode', async () => {
  renderEditor()

  const source = [
    '# 접근 방법',
    '',
    '- 두 수를 더한다.',
    '',
    '[문제 보기](https://example.com)',
    '',
    '```java',
    'class Main {}',
    '```',
  ].join('\n')
  const input = screen.getByRole('textbox', { name: '풀이 설명 (선택)' })

  await userEvent.click(input)
  await userEvent.paste(source)
  await userEvent.click(screen.getByRole('button', { name: '미리보기' }))

  expect(
    await screen.findByRole('heading', { name: '접근 방법', level: 3 }),
  ).toBeVisible()
  expect(screen.getByRole('listitem')).toHaveTextContent('두 수를 더한다.')
  expect(screen.getByRole('link', { name: '문제 보기' })).toHaveAttribute(
    'href',
    'https://example.com',
  )
  expect(
    await screen.findByRole('textbox', { name: 'java code' }),
  ).toHaveTextContent('class Main {}')

  await userEvent.click(screen.getByRole('button', { name: '편집' }))

  expect(screen.getByRole('textbox', { name: '풀이 설명 (선택)' })).toHaveValue(
    source,
  )
})

it('shows an empty state and supports keyboard tab navigation', async () => {
  renderEditor()

  const editTab = screen.getByRole('button', { name: '편집' })

  editTab.focus()
  await userEvent.keyboard('{ArrowRight}')
  await userEvent.keyboard('{Enter}')

  expect(screen.getByRole('button', { name: '미리보기' })).toHaveAttribute(
    'data-selected',
    'selected',
  )
  expect(screen.getByText('미리볼 내용이 없습니다.')).toBeVisible()
})

function renderEditor() {
  return render(
    <Theme theme={neutralTheme} mode="light">
      <LayerProvider>
        <MarkdownEditorHarness />
      </LayerProvider>
    </Theme>,
  )
}

function MarkdownEditorHarness() {
  const [value, setValue] = useState('')

  return (
    <SolutionMarkdownEditor
      label="풀이 설명 (선택)"
      description="Markdown 문법을 사용할 수 있습니다."
      placeholder="풀이 과정과 접근 방법을 입력하세요"
      editLabel="편집"
      previewLabel="미리보기"
      modeLabel="풀이 설명 보기 방식"
      emptyPreview="미리볼 내용이 없습니다."
      value={value}
      onChange={setValue}
    />
  )
}
