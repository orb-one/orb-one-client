import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Trash2 } from 'lucide-react'
import type { Practice, PracticeProblem } from '@/lib/api/practice'

interface PracticeDetailTableProps {
  practice: Practice
  isDeleteMode?: boolean
  onDeleteProblem?: (problemId: string) => void
}

export function PracticeDetailTable({
  practice,
  isDeleteMode = false,
  onDeleteProblem,
}: PracticeDetailTableProps) {
  if (!practice.problems || practice.problems.length === 0) {
    return (
      <div className="text-secondary border-border rounded-lg border p-8 text-center">
        <Text>등록된 문제가 없습니다.</Text>
      </div>
    )
  }

  return (
    <Table<PracticeProblem & Record<string, unknown>>
      data={practice.problems as (PracticeProblem & Record<string, unknown>)[]}
      idKey="problemId"
      columns={[
        {
          key: 'provider',
          header: '플랫폼',
          renderCell: (prob: PracticeProblem) => <Text>{prob.provider}</Text>,
        },
        {
          key: 'id',
          header: '문제 ID',
          renderCell: (prob: PracticeProblem) => (
            <Text type="supporting" color="secondary">
              {prob.externalProblemId}
            </Text>
          ),
        },
        {
          key: 'name',
          header: '문제 이름',
          renderCell: (prob: PracticeProblem) => (
            <Text className="font-medium">{prob.name}</Text>
          ),
        },
        {
          key: 'action',
          header: isDeleteMode ? '삭제' : '풀이 이동',
          renderCell: (prob: PracticeProblem) =>
            isDeleteMode ? (
              <Button
                size="sm"
                variant="secondary"
                label="삭제"
                icon={<Icon icon={Trash2} size="sm" />}
                onClick={() => onDeleteProblem?.(prob.problemId)}
              />
            ) : (
              <Button
                size="sm"
                variant="secondary"
                label="> 풀이로 이동"
                href={prob.url ?? ''}
                target={prob.url ? '_blank' : ''}
                isDisabled={!prob.url}
                onClick={(e) => {
                  if (!prob.url) {
                    e.preventDefault()
                  }
                }}
              />
            ),
        },
      ]}
    />
  )
}
