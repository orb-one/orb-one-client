import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { TabList, Tab } from '@astryxdesign/core/TabList'
import { Stack } from '@astryxdesign/core/Stack'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Crown, User, Users } from 'lucide-react'
import { useState } from 'react'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { getGroup } from '@/lib/api/groups'
import { useGroupPractices } from '@/lib/api/practice'
import { PracticeList } from '@/components/practice/PracticeList'
import { CreatePracticeModal } from '@/components/practice/CreatePracticeModal'

export const Route = createFileRoute('/groups_/$groupId')({
  component: GroupPage,
})

export function GroupPage() {
  const { groupId } = Route.useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('practice')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: practices, isLoading: practicesLoading } =
    useGroupPractices(groupId)

  // GET /groups/{groupId} 상세 및 멤버 조회 API
  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  })

  const isAuthRequired = groupQuery.error instanceof AuthSessionExpiredError
  const group = groupQuery.data

  return (
    <Center width="100%">
      <VStack
        width="100%"
        maxWidth={1024}
        gap={6}
        paddingInline={4}
        paddingBlock={10}
      >
        {/* 공통 상단 (목록으로 돌아가기, 타이틀) */}
        <HStack width="100%">
          <Button
            label="목록으로 돌아가기"
            size="sm"
            variant="secondary"
            icon={<Icon icon={ArrowLeft} size="sm" />}
            onClick={() => void navigate({ to: '/groups' })}
          />
        </HStack>

        <VStack gap={2}>
          <Text type="supporting" color="secondary">
            GROUP ID: {groupId}
          </Text>
          <Heading level={1}>{group ? group.name : '그룹 홈'}</Heading>
        </VStack>

        {/* 탭 기반 구조 */}
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
                {practicesLoading ? (
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
            <div className="border-border bg-surface rounded-lg border p-4">
              {groupQuery.isPending ? (
                <GroupDetailSkeleton />
              ) : groupQuery.isError || !group ? (
                <Banner
                  status={isAuthRequired ? 'info' : 'error'}
                  title={
                    isAuthRequired
                      ? '로그인이 필요한 서비스입니다.'
                      : '그룹 멤버 정보를 불러오는 데 실패했습니다.'
                  }
                  endContent={
                    isAuthRequired ? (
                      <Button
                        label="로그인"
                        href="/login"
                        size="sm"
                        variant="secondary"
                      />
                    ) : (
                      <Button
                        label="다시 시도"
                        size="sm"
                        variant="secondary"
                        onClick={() => void groupQuery.refetch()}
                      />
                    )
                  }
                />
              ) : (
                <Section width="100%" padding={0}>
                  {group.members.length === 0 ? (
                    <EmptyState
                      title="등록된 멤버가 없습니다."
                      description="아직 이 그룹에 참여한 멤버가 없습니다."
                      icon={<Icon icon={Users} size="lg" color="secondary" />}
                      headingLevel={2}
                    />
                  ) : (
                    <List
                      header={
                        <HStack vAlign="center" gap={2}>
                          <Heading level={2}>참여 멤버 목록</Heading>
                          <Badge
                            label={`${String(group.members.length)}명`}
                            variant="neutral"
                          />
                        </HStack>
                      }
                      density="balanced"
                      hasDividers
                    >
                      {group.members.map((member) => {
                        const isOwner = member.role === 'OWNER'
                        return (
                          <ListItem
                            key={member.userId}
                            label={member.nickname}
                            description={`User ID: ${member.userId}`}
                            startContent={
                              <Icon
                                icon={isOwner ? Crown : User}
                                size="sm"
                                color={isOwner ? 'accent' : 'secondary'}
                              />
                            }
                            endContent={
                              <Badge
                                label={
                                  isOwner ? '소유자 (OWNER)' : '멤버 (MEMBER)'
                                }
                                variant={isOwner ? 'blue' : 'neutral'}
                              />
                            }
                          />
                        )
                      })}
                    </List>
                  )}
                </Section>
              )}
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

function GroupDetailSkeleton() {
  return (
    <VStack role="status" aria-live="polite" gap={6} width="100%">
      <VisuallyHidden>그룹 정보를 불러오는 중입니다.</VisuallyHidden>
      <VStack gap={2}>
        <Skeleton width="30%" height={16} radius={2} />
        <Skeleton width="60%" height={32} radius={2} />
      </VStack>
      <Section width="100%" padding={4} dividers={['bottom']}>
        <VStack gap={3}>
          <Skeleton width="20%" height={24} radius={2} />
          <Skeleton width="100%" height={40} radius={2} />
          <Skeleton width="100%" height={40} radius={2} />
        </VStack>
      </Section>
    </VStack>
  )
}
