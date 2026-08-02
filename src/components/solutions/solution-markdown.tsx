import { Markdown, type MarkdownComponents } from '@astryxdesign/core/Markdown'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

import { SolutionCodeBlock } from '@/components/solutions/solution-code-block'

const solutionMarkdownComponents = {
  code: SolutionMarkdownCodeBlock,
  image: SolutionMarkdownImage,
} satisfies Partial<MarkdownComponents>

/** 풀이 설명용 Markdown 렌더러. 페이지의 제목 계층과 코드 강조 규칙을 유지한다. */
export function SolutionMarkdown({ children }: SolutionMarkdownProps) {
  return (
    <Markdown
      data-testid="solution-description"
      autolink="gfm"
      contentWidth={680}
      headingLevelStart={3}
      components={solutionMarkdownComponents}
    >
      {children}
    </Markdown>
  )
}

/** Markdown 코드 펜스에도 풀이 코드와 동일한 언어별 구문 강조를 적용한다. */
function SolutionMarkdownCodeBlock({
  code,
  language,
}: {
  code: string
  language?: string
}) {
  return (
    <VStack width="100%" paddingBlock={2}>
      <SolutionCodeBlock
        code={code}
        language={language ?? null}
        ariaLabel={language ? `${language} code` : 'Code'}
        isCollapsible
        size="viewer-md"
      />
    </VStack>
  )
}

/** 외부 이미지 자동 요청을 피하면서 이미지의 대체 설명은 본문에 남긴다. */
function SolutionMarkdownImage({ alt }: { src: string; alt: string }) {
  return (
    <Text as="span" type="supporting" color="secondary">
      [{alt}]
    </Text>
  )
}

interface SolutionMarkdownProps {
  children: string
}
