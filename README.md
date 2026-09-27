# Orb One Client React

React, TypeScript, Vite 기반 frontend 프로젝트입니다.

## 기술 스택

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Zustand
- Astryx Design System
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
pnpm test:e2e:install # Playwright Chromium 설치
pnpm test:e2e      # Playwright e2e run
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

## Environment Variables

로컬 환경 파일은 `.env.example`을 복사해서 만듭니다.

```bash
cp .env.example .env.local
```

현재 사용하는 환경변수:

```txt
VITE_API_BASE_URL=http://localhost:8080
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

로컬에서 실제 개발 API를 같은 origin처럼 호출하려면 proxy mode를 사용할 수 있습니다.

```txt
VITE_API_BASE_URL=http://localhost:5173
API_PROXY_TARGET=https://api.example.com
```

이 경우 브라우저 요청은 `http://localhost:5173/auth/...`로 나가고, Vite dev server가 `API_PROXY_TARGET`으로 전달합니다.

아직 구현되지 않은 API를 로컬에서 대체하려면 MSW browser mock을 켤 수 있습니다.

```txt
VITE_ENABLE_MSW=true
VITE_MSW_USER_NICKNAME=dev-user
```

현재 mock layer는 `/auth/register`, `/auth/login`, `/auth/logout` 요청은 실제 서버로 통과시키고, 성공한 auth 요청을 기준으로 `GET /users/me`를 mock 응답으로 대체합니다. `GET /solutions`, `GET /solutions/{solutionId}`, `POST /solutions`는 최신 서버 DTO와 같은 형태의 browser memory 기반 mock으로 제공합니다.
실제 서버의 `/users/me` 구현을 확인할 때는 `VITE_ENABLE_MSW=false`로 둡니다.

주의:

- `VITE_` prefix 환경변수는 browser bundle에 노출됩니다.
- `VITE_API_BASE_URL`은 필수 값이며 fallback URL은 사용하지 않습니다.
- `VITE_TURNSTILE_SITE_KEY`는 공개 가능한 widget 식별자입니다. 서버 검증용 Secret Key를 클라이언트 환경변수에 넣지 않습니다.
- `API_PROXY_TARGET`은 Vite dev server 전용 값이며 browser bundle에 노출되지 않습니다.
- `VITE_ENABLE_MSW`는 개발용 browser mock switch입니다.
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
- 일반 API 요청이 401을 받으면 `/auth/refresh`를 호출하고 성공 시 원 요청을 1회 재시도합니다.
- refresh 실패 시 `AuthSessionExpiredError`를 throw하며 app provider가 current user cache 정리와 세션 만료 toast를 처리합니다.

## Routing

route는 `src/routes/` 아래에 TanStack Router file route로 추가합니다.

`src/routeTree.gen.ts`는 TanStack Router가 생성하는 파일입니다.
직접 수정하지 않고, route 파일을 변경한 뒤 dev/build 과정에서 갱신되도록 둡니다.
이 파일은 build 안정성을 위해 커밋 대상에 포함합니다.

## UI

shared UI는 `src/components/`에 두고 Astryx component와 token을 우선 사용합니다.
Tailwind CSS는 layout과 Astryx token 기반 override에만 사용합니다.

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

### E2E Testing

실제 API 서버를 대상으로 인증 화면 흐름을 확인할 때는 Playwright E2E를 사용합니다.
테스트는 매 실행마다 랜덤 이메일을 만들어 회원가입 후 같은 계정으로 로그인하고 로그아웃합니다.
기본 인증 E2E는 화면 흐름을 독립적으로 검증하기 위해 `/users/me`만 계약 응답으로 대체합니다. 실제 refresh E2E는 전용 계정으로 `/users/me`와 `/auth/refresh`를 포함한 인증 경로 전체를 서버에 요청합니다.

처음 실행하거나 Playwright 버전이 변경된 뒤에는 Chromium을 설치합니다.

```bash
pnpm test:e2e:install
```

```bash
pnpm test:e2e
```

이미 `http://localhost:5173`에서 이 프로젝트의 Vite dev server를 실행 중이면:

```bash
E2E_REUSE_SERVER=true pnpm test:e2e
```

사용 환경변수:

- `VITE_API_BASE_URL`: 실제 API 서버 URL. `.env`에서 로드됩니다.
- `VITE_TURNSTILE_SITE_KEY`: 로그인·회원가입 Turnstile widget의 공개 sitekey입니다. 로컬 및 자동화 테스트에서는 Cloudflare 공식 테스트 sitekey를 사용합니다.
- `API_PROXY_TARGET`: 로컬 proxy 대상 API URL입니다. 설정하면 `/auth`, `/users` 요청을 이 URL로 전달합니다.
- `VITE_ENABLE_MSW`: `true`이면 browser MSW mock layer를 시작합니다. 기본값은 비활성 상태입니다.
- `VITE_MSW_USER_NICKNAME`: `/users/me` mock 응답의 nickname입니다. 기본값은 `dev-user`입니다.
- `E2E_ENABLE_MSW`: `true`이면 E2E에서도 browser MSW mock layer를 시작합니다. 기본값은 `false`입니다.
- `E2E_TEST_EMAIL_DOMAIN`: 랜덤 테스트 이메일 domain. 기본값은 `example.com`입니다.
- `E2E_TEST_PASSWORD`: 테스트 계정 비밀번호. 기본값은 `password123!`입니다.
- `E2E_EXPECT_AUTH_COOKIES`: `true`이면 로그인 후 auth cookie 저장까지 검증합니다.
- `E2E_LIVE_AUTH`: `true`이면 실제 API의 로그인, access token 만료, refresh cookie 재발급 경로를 검증합니다.

로컬 proxy mode에서 auth cookie 저장까지 확인하려면:

```bash
VITE_API_BASE_URL=http://localhost:5173 API_PROXY_TARGET=https://api.example.com E2E_EXPECT_AUTH_COOKIES=true pnpm test:e2e
```

실제 API의 refresh 경로까지 검증하려면 전용 테스트 계정을 지정합니다. 테스트는 access cookie만 무효화한 뒤 `/users/me`의 401, `/auth/refresh`의 200, 원 요청 재시도 성공과 인증 cookie 재발급을 확인합니다.

```bash
VITE_API_BASE_URL=http://localhost:5173 API_PROXY_TARGET=https://api.example.com E2E_TEST_EMAIL=auth-e2e@example.com E2E_TEST_PASSWORD=replace-with-dedicated-test-account-password pnpm test:e2e:auth-live
```

## 라이선스

직접 작성한 코드와 문서는 [MIT 라이선스](./LICENSE)를 따릅니다. 이미지와 외부 로고는 제외하며, 대상 파일과 외부 저작물 고지는 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)에 정리했습니다.
