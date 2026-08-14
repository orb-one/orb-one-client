import type { GroupSummaryResponse } from '@/lib/api/groups'

export const mockGroupSummaryList: GroupSummaryResponse[] = [
  {
    groupId: '12be2f52-81dd-41b7-914c-03d73e417130',
    name: '알고리즘 스터디 1반',
    nickname: 'userA',
    createdAt: '2026-07-31T15:46:25',
  },
  {
    groupId: '164d381c-df19-4854-96c1-1ec443ea4bcc',
    name: '코딩테스트 대비반',
    nickname: 'testerB',
    createdAt: '2026-07-26T14:18:42',
  },
  {
    groupId: '54f2cc6b-c10b-4e79-96d2-e933297fe748',
    name: 'React 프로젝트 스터디',
    nickname: 'devMaster',
    createdAt: '2026-08-01T09:00:00',
  },
]
