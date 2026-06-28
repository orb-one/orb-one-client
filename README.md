# Orb One Client React

React, TypeScript, Vite 기반 frontend 프로젝트입니다.

## 기술 스택

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Zustand
- shadcn/ui, Radix UI
- Tailwind CSS v4
- ESLint, Prettier
- Vitest, Testing Library

## 시작하기

CI 기준 Node.js 버전은 24입니다.
package manager는 `pnpm`만 사용합니다.

```bash
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm dev           # Vite dev server 실행
pnpm build         # TypeScript build 후 Vite production build
pnpm preview       # production build preview
pnpm typecheck     # TypeScript typecheck
pnpm lint          # ESLint 실행
pnpm format        # Prettier write
pnpm format:check  # Prettier check
pnpm test          # Vitest run
pnpm test:watch    # Vitest watch mode
pnpm check         # typecheck, lint, format:check, test, build 전체 실행
```

PR 전에는 최소한 아래 명령이 통과해야 합니다.

```bash
pnpm check
```

## 협업 규칙

커밋 메시지는 [CONTRIBUTING.md](./CONTRIBUTING.md)의 커밋 컨벤션을 따릅니다.

Git hook은 다음 역할을 합니다.

- `pre-commit`: staged file에 `lint-staged` 실행
- `commit-msg`: 커밋 메시지 형식 검증

CI는 GitHub Actions에서 `typecheck`, `lint`, `format:check`, `test`, `build`를 실행합니다.

## Agent Guide

AI 에이전트가 작업할 때는 [AGENTS.md](./AGENTS.md)의 작업 가이드를 따릅니다.

## Project Structure

```txt
src/
  app/          app-level provider와 composition
  components/   shared UI component
  lib/          framework-agnostic utility와 API helper
  routes/       TanStack Router file route
  stores/       Zustand client/UI state store
  test/         test setup과 test utility
```

주요 파일:

- `src/app/providers.tsx`: app-level provider 구성
- `src/lib/api/client.ts`: 공통 API client
- `src/routes/`: TanStack Router route 파일
- `src/routeTree.gen.ts`: TanStack Router generated route tree
- `src/components/ui/`: shadcn/ui component

## Environment Variables

로컬 환경 파일은 `.env.example`을 복사해서 만듭니다.

```bash
cp .env.example .env.local
```

현재 사용하는 환경변수:

```txt
VITE_API_BASE_URL=http://localhost:8080
```

주의:

- `VITE_` prefix 환경변수는 browser bundle에 노출됩니다.
- `VITE_API_BASE_URL`은 필수 값이며 fallback URL은 사용하지 않습니다.
- `.env`, `.env.*` 파일은 커밋하지 않습니다.
- 공유 가능한 예시는 `.env.example`에만 작성합니다.

## API Layer

API 요청은 `src/lib/api/client.ts`의 `apiClient`를 통해 수행합니다.
component에서 `fetch`를 직접 호출하지 않고, feature/query function에서 `apiClient`를 사용합니다.

```ts
apiClient('/users')
apiClient('users')
```

동작 규칙:

- path는 leading slash 유무와 관계없이 처리됩니다.
- `VITE_API_BASE_URL`에 `/api` 같은 path가 있어도 보존됩니다.
- absolute URL은 허용하지 않습니다.
- JSON 응답은 JSON으로 parse합니다.
- empty response는 `undefined`를 반환합니다.
- non-JSON response는 text를 반환합니다.
- 실패 응답은 `ApiError`를 throw하며 status, 원본 `Response`, parsed body를 포함합니다.

## Routing

route는 `src/routes/` 아래에 TanStack Router file route로 추가합니다.

`src/routeTree.gen.ts`는 TanStack Router가 생성하는 파일입니다.
직접 수정하지 않고, route 파일을 변경한 뒤 dev/build 과정에서 갱신되도록 둡니다.
이 파일은 build 안정성을 위해 커밋 대상에 포함합니다.

## UI

shared UI는 `src/components/`에 둡니다.
shadcn/ui component는 필요한 것만 추가하고, Radix UI 기반 접근성 패턴을 유지합니다.

UI 변경 시 다음 상태를 함께 확인합니다.

- desktop
- mobile
- loading state
- empty state
- error state
- keyboard navigation
- focus state

## Testing

테스트는 Vitest와 Testing Library를 사용합니다.

- UI component 변경 시 관련 component test를 고려합니다.
- API client 변경 시 `src/lib/api/client.test.ts`를 함께 업데이트합니다.
- PR 전 `pnpm check`를 실행합니다.
