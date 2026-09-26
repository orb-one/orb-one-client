# Agent Guide

## Project Overview

- React, TypeScript, Vite 기반 프론트엔드 프로젝트
- TanStack Router로 file-based routing 구성
- TanStack Query로 server state 관리
- Zustand로 client/UI state 관리
- Astryx Design System, Tailwind CSS 기반 UI 구성
- Astryx Design System을 단일 UI component 계층으로 사용

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
- 코드 주석은 한국어로 짧게 작성하고, API·타입·필드 이름은 코드 표기 그대로 사용
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

## Naming Rules

- 일반 source, Hook, store, utility, test 파일명은 `kebab-case` 사용
- React component와 TypeScript type/class 식별자는 `PascalCase` 사용
- 함수, 변수, Hook 식별자는 `camelCase` 사용, Hook은 `use`로 시작
- test 파일은 대상 파일명에 `.test.ts` 또는 `.test.tsx`를 붙임
- `src/routes/`는 TanStack Router 파일명 규칙을 우선하며, route tree 제외 파일은 `-` prefix 사용
- framework, code generator, 외부 도구가 요구하는 파일명은 예외

## Generated Files

- `src/routeTree.gen.ts`는 TanStack Router 생성 파일
- 직접 수정하지 않음
- 커밋 대상에 포함
- route 파일 변경 후 dev/build 과정에서 갱신될 수 있음

## UI Rules

- 신규 UI와 전환이 완료된 화면은 Astryx 컴포넌트와 token을 우선 사용
- Tailwind CSS는 layout과 token-backed override에만 사용
- shadcn/ui, Radix UI와 `legacy-*` utility를 새로 도입하지 않음
- desktop/mobile 상태 확인
- loading/empty/error state 고려
- 버튼, 입력, 메뉴, 토글 등 신규 interactive UI는 Astryx 패턴 우선 사용
- 페이지 단위 돌아가기 안내를 추가하거나 수정할 때는 제목 위에 `src/components/navigation/page-back-link.tsx`의 `PageBackLink`를 사용
- 돌아가기 문구는 실제 이동 목적지를 설명하고, 기존 고정 목적지를 브라우저 방문 기록 동작으로 임의 변경하지 않음
- 목적지가 별도로 지정되지 않은 새 화면은 `PageBackLink`의 `href`를 생략해 등록된 가장 가까운 상위 페이지 라우트로 이동하고, 브라우저 방문 기록에 의존하지 않음

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

<!-- ASTRYX:START -->

Astryx v0.1.6 · 149 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:

1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:

- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else Tailwind utilities backed by tokens (bg-surface, text-primary, rounded-lg) via tailwind-theme.css. No raw hex/px.
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-\* in :root.

MORE CLI:
search "<query>" find any component / hook / doc / template / block
component --list 149 components by category
template --list page + block recipes
docs <topic> color, elevation, icons, illustrations, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
swizzle <Name> eject component source for deep customization
upgrade --apply run after any @astryxdesign/core bump

<!-- ASTRYX:END -->
