import { Button } from '@astryxdesign/core/Button'
import { Badge } from '@astryxdesign/core/Badge'
import { Icon } from '@astryxdesign/core/Icon'
import { Table, proportional, pixel } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Trash2, ExternalLink, List } from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
          width: proportional(1),
          renderCell: (prob: PracticeProblem) => <Text>{prob.provider}</Text>,
        },
        {
          key: 'id',
          header: '문제 ID',
          width: proportional(1),
          renderCell: (prob: PracticeProblem) => (
            <Text type="supporting" color="secondary">
              {prob.externalProblemId}
            </Text>
          ),
        },
        {
          key: 'name',
          header: '문제 이름',
          width: proportional(2),
          renderCell: (prob: PracticeProblem) => (
            <Text className="font-medium">{prob.name}</Text>
          ),
        },
        {
          key: 'difficulty',
          header: '난이도',
          width: proportional(1),
          renderCell: (prob: PracticeProblem) =>
            prob.difficulty ? (
              <Badge label={prob.difficulty} />
            ) : (
              <Text type="supporting" color="secondary">
                -
              </Text>
            ),
        },
        {
          key: 'action',
          header: isDeleteMode ? '삭제' : '이동',
          width: pixel(240),
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  label="문제 열기"
                  icon={<Icon icon={ExternalLink} size="sm" />}
                  href={prob.url ?? ''}
                  target={prob.url ? '_blank' : ''}
                  isDisabled={!prob.url}
                  onClick={(e) => {
                    if (!prob.url) {
                      e.preventDefault()
                    }
                  }}
                />
                <Link
                  to="/solutions"
                  search={{ problemId: prob.problemId }}
                  className="block"
                >
                  <Button
                    size="sm"
                    variant="primary"
                    label="풀이 목록"
                    icon={<Icon icon={List} size="sm" />}
                  />
                </Link>
              </div>
            ),
        },
      ]}
    />
  )
}
