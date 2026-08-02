import { createFileRoute } from '@tanstack/react-router'
import { Center } from '@astryxdesign/core/Center'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { TabList, Tab } from '@astryxdesign/core/TabList'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Stack } from '@astryxdesign/core/Stack'
import { useState } from 'react'

import { useGroupPractices } from '@/lib/api/practice'
import { PracticeList } from '@/components/practice/PracticeList'
import { CreatePracticeModal } from '@/components/practice/CreatePracticeModal'

export const Route = createFileRoute('/groups_/$groupId')({
  component: GroupPage,
})

function GroupPage() {
  const { groupId } = Route.useParams()
  const [activeTab, setActiveTab] = useState('practice')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: practices, isLoading } = useGroupPractices(groupId)

  return (
    <Center width="100%">
      <VStack
        width="100%"
        maxWidth={1024}
        gap={6}
        paddingInline={4}
        paddingBlock={10}
      >
        <Heading level={1}>그룹 홈</Heading>
        <Stack gap={6}>
          <TabList value={activeTab} onChange={setActiveTab}>
            <Tab value="problemSets" label="문제집" />
            <Tab value="practice" label="연습" />
            <Tab value="members" label="멤버" />
          </TabList>

          {activeTab === 'practice' && (
            <Stack gap={4}>
              <HStack hAlign="end">
                <Button
                  label="연습 만들기"
                  variant="primary"
                  onClick={() => {
                    setIsModalOpen(true)
                  }}
                />
              </HStack>

              <div className="border-border bg-surface overflow-hidden rounded-lg border">
                {isLoading ? (
                  <div className="text-secondary p-8 text-center">
                    <Text>로딩 중...</Text>
                  </div>
                ) : (
                  <PracticeList practices={practices ?? []} groupId={groupId} />
                )}
              </div>
            </Stack>
          )}

          {activeTab === 'problemSets' && (
            <div className="text-secondary border-border rounded-lg border p-8 text-center">
              <Text>문제집 컨텐츠 영역</Text>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="text-secondary border-border rounded-lg border p-8 text-center">
              <Text>멤버 컨텐츠 영역</Text>
            </div>
          )}
        </Stack>

        <CreatePracticeModal
          groupId={groupId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
          }}
        />
      </VStack>
    </Center>
  )
}
