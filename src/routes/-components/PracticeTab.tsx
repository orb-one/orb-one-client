import { useState } from 'react'

import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Icon } from '@astryxdesign/core/Icon'
import { Dumbbell } from 'lucide-react'

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
            label="새 연습 시작"
            size="sm"
            variant="primary"
            icon={<Icon icon={Dumbbell} size="sm" />}
            onClick={() => setIsModalOpen(true)}
          />
        </HStack>

        <div className="border-border bg-surface overflow-hidden rounded-lg border">
          {practicesLoading ? (
            <div className="text-secondary p-8 text-center">
              <Text>로딩 중...</Text>
            </div>
          ) : (
            <PracticeList practices={practices ?? []} groupId={groupId} />
          )}
        </div>
      </Stack>

      <CreatePracticeModal
        groupId={groupId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
