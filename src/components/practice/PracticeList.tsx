import { Button } from '@astryxdesign/core/Button'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import type { Practice } from '@/lib/api/practice'
import { Trash2 } from 'lucide-react'
import { Icon } from '@astryxdesign/core/Icon'

interface PracticeListProps {
  practices: Practice[]
  groupId?: string
  isDeleteMode: boolean
  onDeletePractice: (practiceId: string) => void
  onEditPractice: (practice: Practice) => void
}

export function PracticeList({
  practices,
  isDeleteMode,
  onDeletePractice,
  onEditPractice,
}: PracticeListProps) {
  if (!Array.isArray(practices)) {
    return (
      <div className="p-8 text-center text-red-500">
        <Text>서버 응답 오류: 데이터가 배열 형식이 아닙니다.</Text>
        <pre className="mt-4 overflow-auto text-left text-xs">
          {JSON.stringify(practices, null, 2)}
        </pre>
      </div>
    )
  }

  if (practices.length === 0) {
    return (
      <div className="text-secondary p-8 text-center">
        <Text>생성된 연습이 없습니다.</Text>
      </div>
    )
  }

  return (
    <Table<Practice & Record<string, unknown>>
      data={practices as (Practice & Record<string, unknown>)[]}
      idKey="id"
      columns={[
        {
          key: 'title',
          header: '제목',
          width: proportional(2),
          renderCell: (p: Practice) => {
            const externalUrl = p.problems?.[0]?.url
            if (externalUrl) {
              return (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  {p.title}
                </a>
              )
            }
            return <Text type="supporting">{p.title}</Text>
          },
        },
        {
          key: 'start',
          header: '시작일시',
          width: proportional(1.5),
          renderCell: (p: Practice) => (
            <Text type="supporting">
              {new Date(p.startDate).toLocaleString()}
            </Text>
          ),
        },
        {
          key: 'end',
          header: '종료일시',
          width: proportional(1.5),
          renderCell: (p: Practice) => (
            <Text type="supporting">
              {new Date(p.endDate).toLocaleString()}
            </Text>
          ),
        },
        {
          key: 'action',
          header: isDeleteMode ? '삭제' : '수정',
          width: pixel(100),
          renderCell: (p: Practice) =>
            isDeleteMode ? (
              <Button
                size="sm"
                variant="secondary"
                label="삭제"
                icon={<Icon icon={Trash2} size="sm" />}
                onClick={() => {
                  if (confirm(`'${p.title}' 연습을 정말 삭제하시겠습니까?`)) {
                    onDeletePractice(p.id)
                  }
                }}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                label="수정"
                onClick={() => {
                  onEditPractice(p)
                }}
              />
            ),
        },
      ]}
    />
  )
}
