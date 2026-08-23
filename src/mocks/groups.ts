import type {
  GroupDetailResponse,
  GroupSummaryResponse,
} from '@/lib/api/groups'

// 1. GET /groups 목록용 Mock
export const mockGroupSummaryList: GroupSummaryResponse[] = [
  {
    groupId: '6f9619ff-8b86-d011-b42d-00c04fc964ff',
    name: '알고리즘 스터디 1반',
    nickname: 'algo_master',
    createdAt: '2026-07-31T15:46:25',
    isMember: true,
  },
  {
    groupId: '164d381c-df19-4854-96c1-1ec443ea4bcc',
    name: '코딩테스트 대비반',
    nickname: 'testerB',
    createdAt: '2026-07-26T14:18:42',
    isMember: false,
  },
]

// 2. GET /groups/:groupId 상세용 Mock
export const mockGroupDetails: Record<string, GroupDetailResponse> = {
  '6f9619ff-8b86-d011-b42d-00c04fc964ff': {
    groupId: '6f9619ff-8b86-d011-b42d-00c04fc964ff',
    groupName: '알고리즘 스터디 1반',
    members: [
      {
        userId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
        nickname: 'algo_master',
        role: 'OWNER',
      },
      {
        userId: 'a0e2d4de-b268-44b1-bf8a-fb49d725deb4',
        nickname: 'userA',
        role: 'MEMBER',
      },
    ],
  },
}
