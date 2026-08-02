import { Button } from '@astryxdesign/core/Button'
import { Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import type { MockPractice, MockProblem } from '@/mocks/practice-data'

interface PracticeDetailTableProps {
  practice: MockPractice
}

export function PracticeDetailTable({ practice }: PracticeDetailTableProps) {
  if (!practice.problems || practice.problems.length === 0) {
    return (
      <div className="text-secondary border-border rounded-lg border p-8 text-center">
        <Text>등록된 문제가 없습니다.</Text>
      </div>
    )
  }

  return (
    <Table
      data={practice.problems}
      idKey="problemId"
      columns={[
        {
          key: 'provider',
          header: '플랫폼',
          renderCell: (prob: MockProblem) => <Text>{prob.provider}</Text>,
        },
        {
          key: 'id',
          header: '문제 ID',
          renderCell: (prob: MockProblem) => (
            <Text type="supporting" color="secondary">
              {prob.externalProblemId}
            </Text>
          ),
        },
        {
          key: 'name',
          header: '제목',
          renderCell: (prob: MockProblem) => (
            <Text className="font-medium">{prob.name}</Text>
          ),
        },
        {
          key: 'action',
          header: '풀이 이동',
          renderCell: (prob: MockProblem) => (
            <Button
              size="sm"
              variant="secondary"
              label="> 풀이로 이동"
              href={prob.url}
              target="_blank"
            />
          ),
        },
      ]}
    />
  )
}
