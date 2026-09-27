import { SolutionMarkdown } from '@/components/solutions/solution-markdown'

export function SolutionMarkdownPreviewContent({
  value,
}: SolutionMarkdownPreviewContentProps) {
  return (
    <SolutionMarkdown onLinkClick={openPreviewLink}>{value}</SolutionMarkdown>
  )
}

function openPreviewLink(href: string) {
  window.open(href, '_blank', 'noopener,noreferrer')
  return false as const
}

interface SolutionMarkdownPreviewContentProps {
  value: string
}
