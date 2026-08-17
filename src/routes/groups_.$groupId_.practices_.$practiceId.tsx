import { createFileRoute, Link } from '@tanstack/react-router'
import { Center } from '@astryxdesign/core/Center'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { usePracticeDetail, useRemovePracticeProblem } from '@/lib/api/practice'
import { PracticeDetailTable } from '@/components/practice/PracticeDetailTable'
import { AddPracticeProblemModal } from '@/components/practice/AddPracticeProblemModal'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@astryxdesign/core/Toast'

export const Route = createFileRoute(
  '/groups_/$groupId_/practices_/$practiceId',
)({
  component: PracticeDetailPage,
})

function PracticeDetailPage() {
  const { groupId, practiceId } = Route.useParams()
  const { data: practice, isLoading } = usePracticeDetail(groupId, practiceId)

  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const showToast = useToast()

  const removeProblem = useRemovePracticeProblem(groupId, practiceId)

  const handleDeleteProblem = (problemId: string) => {
    removeProblem.mutate(problemId, {
      onSuccess: () => {
        showToast({ body: '문제가 삭제되었습니다.' })
      },
      onError: () => {
        showToast({ body: '문제 삭제에 실패했습니다.', type: 'error' })
      },
    })
  }

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
            <div className="flex items-end justify-between">
              <Heading level={1}>{practice?.title ?? '연습 이름'}</Heading>

              <div className="flex gap-2">
                <Button
                  label={isDeleteMode ? '삭제 취소' : '문제 삭제'}
                  size="sm"
                  variant="secondary"
                  icon={!isDeleteMode && <Icon icon={Trash2} size="sm" />}
                  onClick={() => {
                    setIsDeleteMode(!isDeleteMode)
                  }}
                />
                <Button
                  label="문제 추가"
                  size="sm"
                  variant="primary"
                  icon={<Icon icon={Plus} size="sm" />}
                  onClick={() => {
                    setIsAddModalOpen(true)
                  }}
                />
              </div>
            </div>
          </div>

          <div className="border-border bg-surface overflow-hidden rounded-lg border">
            {isLoading ? (
              <div className="text-secondary p-8 text-center">
                <Text>로딩 중...</Text>
              </div>
            ) : practice ? (
              <PracticeDetailTable
                practice={practice}
                isDeleteMode={isDeleteMode}
                onDeleteProblem={handleDeleteProblem}
              />
            ) : (
              <div className="text-secondary p-8 text-center">
                <Text>연습 정보를 찾을 수 없습니다.</Text>
              </div>
            )}
          </div>
        </Stack>
      </VStack>

      <AddPracticeProblemModal
        groupId={groupId}
        practiceId={practiceId}
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
        }}
      />
    </Center>
  )
}
