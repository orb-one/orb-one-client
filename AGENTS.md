# Agent Guide

## Project Overview

- React, TypeScript, Vite 기반 프론트엔드 프로젝트
- TanStack Router로 file-based routing 구성
- TanStack Query로 server state 관리
- Zustand로 client/UI state 관리
- shadcn/ui, Radix UI, Tailwind CSS 기반 UI 구성

## Required Commands

- install: `pnpm install`
- dev: `pnpm dev`
- full check: `pnpm check`
- typecheck: `pnpm typecheck`
- lint: `pnpm lint`
- format check: `pnpm format:check`
- test: `pnpm test`
- build: `pnpm build`

## Working Rules

- package manager는 `pnpm`만 사용
- 커밋은 사용자가 명시적으로 요청할 때만 수행
- 변경 전 기존 파일 구조와 주변 패턴 먼저 확인
- 요청 범위 밖의 리팩터링 금지
- 사용자 변경사항을 임의로 되돌리지 않음
- 생성 파일을 임의로 삭제하지 않음
- 작업 후 관련 검증 명령 실행

## Architecture Rules

- server state는 TanStack Query 사용
- client/UI state는 Zustand 사용
- API 요청은 `src/lib/api/client.ts`를 통해 수행
- route는 `src/routes/` 아래 TanStack Router file route로 추가
- shared UI는 `src/components/`에 배치
- app-level provider는 `src/app/`에 배치
- framework-agnostic utility는 `src/lib/`에 배치

## Generated Files

- `src/routeTree.gen.ts`는 TanStack Router 생성 파일
- 직접 수정하지 않음
- 커밋 대상에 포함
- route 파일 변경 후 dev/build 과정에서 갱신될 수 있음

## UI Rules

- shadcn/ui 컴포넌트는 필요한 것만 추가
- Radix UI 기반 접근성 패턴 유지
- desktop/mobile 상태 확인
- loading/empty/error state 고려
- 버튼, 입력, 메뉴, 토글 등은 기존 shadcn/ui 패턴 우선 사용

## Security Rules

- `.env`, `.env.*` 파일 커밋 금지
- `.env.example`만 공유
- `VITE_` prefix 환경변수는 브라우저에 노출됨
- `apiClient`에는 absolute URL을 넘기지 않음
- secret, token, API key 하드코딩 금지
- 외부 URL, HTML 삽입, storage 사용 시 보안 영향 검토

## Testing Rules

- UI component 변경 시 Testing Library 테스트 고려
- API client 변경 시 `src/lib/api/client.test.ts` 업데이트
- route 또는 provider 변경 시 smoke test 필요 여부 검토
- PR 전 `pnpm check` 통과 필요

## Commit Rules

- 커밋 메시지는 `CONTRIBUTING.md` 준수
- `Co-Authored-By` 사용 금지
- 사용자가 요청하지 않으면 커밋하지 않음
