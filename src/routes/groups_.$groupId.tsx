import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, Dumbbell, Users } from 'lucide-react'
import { useState } from 'react'

import { getGroup } from '@/lib/api/groups'

import { MemberTab } from './-components/MemberTab'
import { ProblemSetTab } from './-components/ProblemSetTab'
import { PracticeTab } from './-components/PracticeTab'

export const Route = createFileRoute('/groups_/$groupId')({
  component: GroupDetailPage,
})

type TabType = 'problem-sets' | 'practice' | 'members'

export function GroupDetailPage() {
  const { groupId } = Route.useParams()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabType>('problem-sets')

  // 1. GET /groups/{groupId} 상세 API 직접 호출
  const { data: groupDetail, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  })

  return (
    <Center width="100%">
      <VStack
        width="100%"
        maxWidth={1024}
        gap={6}
        paddingInline={4}
        paddingBlock={10}
      >
        {/* 목록 돌아가기 */}
        <HStack width="100%">
          <Button
            label="그룹 목록으로 돌아가기"
            size="sm"
            variant="secondary"
            icon={<Icon icon={ArrowLeft} size="sm" />}
            onClick={() => void navigate({ to: '/groups' })}
          />
        </HStack>

        {/* 메인 헤더 */}
        <VStack width="100%" gap={8}>
          <VStack width="100%" hAlign="center" gap={1}>
            {/* 로딩 중에는 Skeleton을 표시하여 깜빡임 방지 */}
            {isLoading ? (
              <Skeleton width="220px" height="36px" />
            ) : (
              <Heading level={1}>{groupDetail?.name}</Heading>
            )}
          </VStack>

          {/* 탭 버튼 */}
          <HStack hAlign="center" gap={2}>
            <Button
              label="문제집"
              size="sm"
              variant={activeTab === 'problem-sets' ? 'primary' : 'secondary'}
              icon={<Icon icon={BookOpen} size="sm" />}
              onClick={() => {
                setActiveTab('problem-sets')
              }}
            />
            <Button
              label="연습"
              size="sm"
              variant={activeTab === 'practice' ? 'primary' : 'secondary'}
              icon={<Icon icon={Dumbbell} size="sm" />}
              onClick={() => {
                setActiveTab('practice')
              }}
            />
            <Button
              label="멤버"
              size="sm"
              variant={activeTab === 'members' ? 'primary' : 'secondary'}
              icon={<Icon icon={Users} size="sm" />}
              onClick={() => {
                setActiveTab('members')
              }}
            />
          </HStack>

          {/* 탭 메인 컨테이너 */}
          <Section
            width="100%"
            padding={6}
            style={{
              border:
                '1px solid var(--astryxdesign-color-border-subtle, #e2e8f0)',
              borderRadius: '12px',
            }}
          >
            <VStack width="100%" gap={6}>
              {/* [탭 1] 문제집 탭 */}
              {activeTab === 'problem-sets' && (
                <ProblemSetTab groupId={groupId} />
              )}

              {/* [탭 2] 연습 탭 */}
              {activeTab === 'practice' && <PracticeTab groupId={groupId} />}

              {/* [탭 3] 멤버 탭 */}
              {activeTab === 'members' && <MemberTab groupId={groupId} />}
            </VStack>
          </Section>
        </VStack>
      </VStack>
    </Center>
  )
}
