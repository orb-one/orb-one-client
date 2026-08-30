import type {
  GroupDetailResponse,
  GroupSummaryResponse,
} from '@/lib/api/groups'

// 1. GET /groups 목록용 Mock 데이터
export const mockGroupSummaryList: GroupSummaryResponse[] = [
  {
    groupId: '4038289f-9eaa-46ab-9415-c9330a6a5e7b',
    name: 'test',
    nickname: '주현',
    createdAt: '2026-08-30T08:10:24',
    isMember: false,
  },
  {
    groupId: 'd19855b3-aa74-465d-a8b2-ad0f4607ec2d',
    name: 'test1',
    nickname: '주현',
    createdAt: '2026-08-17T11:16:09',
    isMember: false,
  },
  {
    groupId: '127bc576-78c5-4681-b51d-7b1674bfa5e9',
    name: '알고리즘 스터디 3반',
    nickname: '소현',
    createdAt: '2026-08-02T11:48:33',
    isMember: true,
  },
  {
    groupId: '54f2cc6b-c10b-4e79-96d2-e933297fe748',
    name: '알고리즘 스터디 테스트 1반',
    nickname: 'userA',
    createdAt: '2026-07-31T15:46:53',
    isMember: false,
  },
  {
    groupId: '932f177b-6553-4b4e-9e00-940b7da4fa7e',
    name: '알고리즘 스터디 1반',
    nickname: 'userA',
    createdAt: '2026-07-31T15:46:32',
    isMember: true,
  },
  {
    groupId: '12be2f52-81dd-41b7-914c-03d73e417130',
    name: '알고리즘 스터디 1반',
    nickname: 'userA',
    createdAt: '2026-07-31T15:46:25',
    isMember: false,
  },
  {
    groupId: '7f5b76bf-ca79-4969-87c5-1b80ad88a0ab',
    name: 'auth-fixture-20260728201904',
    nickname: 'auth-a-20260728201904',
    createdAt: '2026-07-28T11:20:35',
    isMember: false,
  },
  {
    groupId: '164d381c-df19-4854-96c1-1ec443ea4bcc',
    name: 'fixture-20260726231836',
    nickname: 'ㄹㅇㅁㄹㅇㄴㅁ',
    createdAt: '2026-07-26T14:18:42',
    isMember: false,
  },
]

// 2. GET /groups/:groupId 상세용 Mock 데이터
export const mockGroupDetails: Record<string, GroupDetailResponse> = {
  '127bc576-78c5-4681-b51d-7b1674bfa5e9': {
    groupId: '127bc576-78c5-4681-b51d-7b1674bfa5e9',
    groupName: '알고리즘 스터디 3반',
    members: [
      {
        userId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
        nickname: '소현',
        role: 'OWNER',
      },
      {
        userId: 'a0e2d4de-b268-44b1-bf8a-fb49d725deb4',
        nickname: 'userB',
        role: 'MEMBER',
      },
      {
        userId: 'c7b5e821-391a-4d44-88a2-97fcb08215aa',
        nickname: 'userC',
        role: 'MEMBER',
      },
    ],
  },
  '932f177b-6553-4b4e-9e00-940b7da4fa7e': {
    groupId: '932f177b-6553-4b4e-9e00-940b7da4fa7e',
    groupName: '알고리즘 스터디 1반',
    members: [
      {
        userId: 'a0e2d4de-b268-44b1-bf8a-fb49d725deb4',
        nickname: 'userA',
        role: 'OWNER',
      },
      {
        userId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
        nickname: '소현',
        role: 'MEMBER',
      },
    ],
  },
}
