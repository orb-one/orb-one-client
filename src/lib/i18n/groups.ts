// src/lib/i18n/copies/groups.ts (또는 원하는 경로)

export interface GroupListCopy {
  title: string
  description: string
  loading: string
  loadError: string
  authRequired: string
  emptyTitle: string
  emptyDescription: string
  retry: string
  joinGroup: string
  joining: string
  createGroup: string
  creating: string
  unknownOwner: string
  selectGroupAlert: string
  login: string
}

export const DEFAULT_GROUPS_COPY: GroupListCopy = {
  title: '그룹 목록',
  description: '가입하려는 그룹을 클릭하여 선택한 후 [그룹 가입] 버튼을 눌러주세요.',
  loading: '그룹 목록을 불러오는 중입니다.',
  loadError: '그룹 목록을 가져오는 데 실패했습니다.',
  authRequired: '로그인이 필요한 서비스입니다.',
  emptyTitle: '개설된 그룹이 없습니다.',
  emptyDescription: '새로운 그룹을 생성하거나 다른 그룹에 참여해보세요.',
  retry: '다시 시도',
  joinGroup: '그룹 가입',
  joining: '가입 진행 중...',
  createGroup: '그룹 만들기',
  creating: '생성 중...',
  unknownOwner: '소유자 정보 없음',
  selectGroupAlert: '가입할 그룹을 먼저 목록에서 선택해주세요.',
  login: '로그인',
}