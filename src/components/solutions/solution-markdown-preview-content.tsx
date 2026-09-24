import { useLayoutEffect } from 'react'

import { SolutionMarkdown } from '@/components/solutions/solution-markdown'

export function SolutionMarkdownPreviewContent({
  value,
  onRendered,
}: SolutionMarkdownPreviewContentProps) {
  useLayoutEffect(() => {
    onRendered()
  }, [value, onRendered])

  return <SolutionMarkdown>{value}</SolutionMarkdown>
}

interface SolutionMarkdownPreviewContentProps {
  value: string
  onRendered: () => void
}
