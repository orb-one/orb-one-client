import { Button } from '@astryxdesign/core/Button'
import { Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Link } from '@tanstack/react-router'
import type { MockPractice } from '@/mocks/practice-data'

interface PracticeListProps {
  practices: MockPractice[]
  groupId: string
}

export function PracticeList({ practices, groupId }: PracticeListProps) {
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
    <Table
      data={practices}
      idKey="practiceId"
      columns={[
        {
          key: 'id',
          header: '연습 ID',
          renderCell: (p: MockPractice) => (
            <Text type="supporting" color="secondary">
              {p.practiceId}
            </Text>
          ),
        },
        {
          key: 'title',
          header: '제목',
          renderCell: (p: MockPractice) => (
            <Link
              to="/groups/$groupId/practices/$practiceId"
              params={{ groupId, practiceId: p.practiceId }}
              className="text-primary font-medium hover:underline"
            >
              {p.title}
            </Link>
          ),
        },
        {
          key: 'start',
          header: '시작일시',
          renderCell: (p: MockPractice) => (
            <Text type="supporting">
              {new Date(p.startDate).toLocaleString()}
            </Text>
          ),
        },
        {
          key: 'end',
          header: '종료일시',
          renderCell: (p: MockPractice) => (
            <Text type="supporting">
              {new Date(p.endDate).toLocaleString()}
            </Text>
          ),
        },
        {
          key: 'action',
          header: '수정',
          renderCell: () => <Button size="sm" variant="ghost" label="수정" />,
        },
      ]}
    />
  )
}
