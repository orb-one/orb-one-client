import { useState } from 'react'

import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Icon } from '@astryxdesign/core/Icon'
import { Plus, Trash2 } from 'lucide-react'

import { useGroupPractices } from '@/lib/api/practice'
import { PracticeList } from '@/components/practice/PracticeList'
import { CreatePracticeModal } from '@/components/practice/CreatePracticeModal'

interface PracticeTabProps {
  groupId: string
}

export function PracticeTab({ groupId }: PracticeTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { data: practices, isLoading: practicesLoading } = useGroupPractices(groupId)

  return (
    <>
      <Stack gap={6} width="100%">
        <HStack width="100%" hAlign="end" gap={2}>
          <Button
            label="연습 삭제"
            size="sm"
            variant="secondary"
            icon={<Icon icon={Trash2} size="sm" />}
            onClick={() => alert('아직 지원되지 않는 기능입니다.')}
          />
          <Button
            label="연습 생성"
            size="sm"
            variant="primary"
            icon={<Icon icon={Plus} size="sm" />}
            onClick={() => setIsModalOpen(true)}
          />
        </HStack>

        <Card>
          {practicesLoading ? (
            <div className="text-secondary p-8 text-center">
              <Text>로딩 중...</Text>
            </div>
          ) : (
            <PracticeList practices={practices ?? []} groupId={groupId} />
          )}
        </Card>
      </Stack>

      <CreatePracticeModal
        groupId={groupId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
