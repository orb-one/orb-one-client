import { useState } from 'react'

import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Icon } from '@astryxdesign/core/Icon'
import { useToast } from '@astryxdesign/core/Toast'
import { Plus, Trash2 } from 'lucide-react'

import { useGroupPractices, useDeletePractice } from '@/lib/api/practice'
import { PracticeList } from '@/components/practice/PracticeList'
import { CreatePracticeModal } from '@/components/practice/CreatePracticeModal'
import { EditPracticeModal } from '@/components/practice/EditPracticeModal'
import type { Practice } from '@/lib/api/practice'

interface PracticeTabProps {
  groupId: string
}

export function PracticeTab({ groupId }: PracticeTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [editPractice, setEditPractice] = useState<Practice | null>(null)

  const showToast = useToast()

  const { data: practices, isLoading: practicesLoading } =
    useGroupPractices(groupId)
  const deletePractice = useDeletePractice(groupId)

  const handleDeletePractice = (practiceId: string) => {
    deletePractice.mutate(practiceId, {
      onSuccess: () => {
        showToast({ body: '연습이 삭제되었습니다.' })
      },
      onError: () => {
        showToast({ body: '연습 삭제에 실패했습니다.', type: 'error' })
      },
    })
  }

  return (
    <>
      <Stack gap={6} width="100%">
        <HStack width="100%" hAlign="end" gap={2}>
          <Button
            label={isDeleteMode ? '삭제 취소' : '연습 삭제'}
            size="sm"
            variant={isDeleteMode ? 'secondary' : 'secondary'}
            icon={!isDeleteMode && <Icon icon={Trash2} size="sm" />}
            onClick={() => {
              setIsDeleteMode(!isDeleteMode)
            }}
          />
          <Button
            label="연습 생성"
            size="sm"
            variant="primary"
            icon={<Icon icon={Plus} size="sm" />}
            onClick={() => {
              setIsModalOpen(true)
            }}
          />
        </HStack>

        <Card>
          {practicesLoading ? (
            <div className="text-secondary p-8 text-center">
              <Text>로딩 중...</Text>
            </div>
          ) : (
            <PracticeList
              practices={practices ?? []}
              groupId={groupId}
              isDeleteMode={isDeleteMode}
              onDeletePractice={handleDeletePractice}
              onEditPractice={setEditPractice}
            />
          )}
        </Card>
      </Stack>

      <CreatePracticeModal
        groupId={groupId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
        }}
      />

      <EditPracticeModal
        groupId={groupId}
        practice={editPractice}
        isOpen={editPractice !== null}
        onClose={() => {
          setEditPractice(null)
        }}
      />
    </>
  )
}
