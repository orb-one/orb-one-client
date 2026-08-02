import { createFileRoute, Link } from '@tanstack/react-router'
import { Center } from '@astryxdesign/core/Center'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { usePracticeDetail } from '@/lib/api/practice'
import { PracticeDetailTable } from '@/components/practice/PracticeDetailTable'

export const Route = createFileRoute(
  '/groups_/$groupId_/practices_/$practiceId',
)({
  component: PracticeDetailPage,
})

function PracticeDetailPage() {
  const { groupId, practiceId } = Route.useParams()
  const { data: practice, isLoading } = usePracticeDetail(groupId, practiceId)

  return (
    <Center width="100%">
      <VStack
        width="100%"
        maxWidth={1024}
        gap={6}
        paddingInline={4}
        paddingBlock={10}
      >
        <Stack gap={6}>
          <div className="flex flex-col gap-1">
            <Text
              type="supporting"
              color="secondary"
              className="cursor-pointer hover:underline"
            >
              <Link to="/groups/$groupId" params={{ groupId }}>
                {'< 이전으로 돌아가기'}
              </Link>
            </Text>
            <Heading level={1}>{practice?.title ?? '연습 이름'}</Heading>
          </div>

          <div className="border-border bg-surface overflow-hidden rounded-lg border">
            {isLoading ? (
              <div className="text-secondary p-8 text-center">
                <Text>로딩 중...</Text>
              </div>
            ) : practice ? (
              <PracticeDetailTable practice={practice} />
            ) : (
              <div className="text-secondary p-8 text-center">
                <Text>연습 정보를 찾을 수 없습니다.</Text>
              </div>
            )}
          </div>
        </Stack>
      </VStack>
    </Center>
  )
}
