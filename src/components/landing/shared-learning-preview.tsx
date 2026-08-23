interface SharedLearningPreviewCopy {
  ariaLabel: string
  collectionLabel: string
  collectionTitle: string
  linkedLabel: string
  linkedTitle: string
  groupSolution: string
  solved: string
  javaSummary: string
  pythonSummary: string
}

interface SharedLearningPreviewProps {
  copy: SharedLearningPreviewCopy
}

const problems = [
  { provider: 'BOJ', number: '1260', title: 'DFS와 BFS' },
  { provider: 'JUNGOL', number: '1828', title: '냉장고' },
  { provider: 'SWEA', number: '1244', title: '최대 상금' },
  { provider: 'Programmers', number: '42889', title: '실패율' },
] as const

export function SharedLearningPreview({ copy }: SharedLearningPreviewProps) {
  return (
    <div
      role="group"
      aria-label={copy.ariaLabel}
      className="overflow-hidden rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-[0_28px_80px_color-mix(in_srgb,var(--color-text-primary)_12%,transparent)]"
    >
      <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-[var(--color-border-subtle)] p-4 sm:p-6 lg:border-r lg:border-b-0">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            {copy.collectionLabel}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
            {copy.collectionTitle}
          </h2>

          <ol className="mt-5 space-y-1" aria-label={copy.collectionTitle}>
            {problems.map((problem, index) => (
              <li
                key={`${problem.provider}-${problem.number}`}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-3 py-3 ${
                  index === 0
                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-medium">
                    <span
                      className={
                        index === 0 ? 'text-[var(--color-accent)]' : ''
                      }
                    >
                      {problem.provider}
                    </span>
                    <span aria-hidden="true" className="opacity-50">
                      {problem.number}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {problem.title}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    index === 0
                      ? 'bg-[var(--color-accent)]'
                      : 'bg-[var(--color-border-subtle)]'
                  }`}
                />
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-[var(--color-bg-subtle)] p-4 sm:p-6">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            {copy.linkedLabel}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
            {copy.linkedTitle}
          </h2>

          <div className="mt-5 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
            <SolutionRow
              language="Java"
              summary={copy.javaSummary}
              groupSolution={copy.groupSolution}
              solved={copy.solved}
            />
            <SolutionRow
              language="Python"
              summary={copy.pythonSummary}
              groupSolution={copy.groupSolution}
              solved={copy.solved}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface SolutionRowProps {
  language: string
  summary: string
  groupSolution: string
  solved: string
}

function SolutionRow({
  language,
  summary,
  groupSolution,
  solved,
}: SolutionRowProps) {
  return (
    <article className="py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
        <span className="text-[var(--color-accent)]">{groupSolution}</span>
        <span className="text-[var(--color-text-secondary)]">{language}</span>
        <span className="ml-auto text-[var(--color-text-secondary)]">
          {solved}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-primary)]">
        {summary}
      </p>
    </article>
  )
}
