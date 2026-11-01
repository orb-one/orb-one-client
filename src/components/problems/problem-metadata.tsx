import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'

import { ProblemDifficultyChip } from '@/components/problems/problem-difficulty-chip'

interface ProblemMetadataProps {
  provider: string | null
  externalId: string | null
  difficulty: string | null
}

export function ProblemMetadata({
  provider,
  externalId,
  difficulty,
}: ProblemMetadataProps) {
  const source = [provider, externalId].filter(Boolean).join(' ')

  if (!source && !difficulty) return null

  return (
    <HStack
      as="span"
      gap={2}
      vAlign="center"
      wrap="wrap"
      className="max-w-full min-w-0"
    >
      {source ? (
        <Text
          type="supporting"
          color="secondary"
          maxLines={1}
          className="max-w-full min-w-0"
        >
          {source}
        </Text>
      ) : null}
      {difficulty ? (
        <ProblemDifficultyChip
          provider={provider ?? ''}
          difficulty={difficulty}
        />
      ) : null}
    </HStack>
  )
}
