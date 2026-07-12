# 기여 가이드

## 파일명 컨벤션

- 일반 source, Hook, store, utility 및 test 파일명은 `kebab-case`를 사용합니다.
- React component, TypeScript type/class 식별자는 `PascalCase`를 사용합니다.
- 함수, 변수, Hook 식별자는 `camelCase`를 사용합니다. Hook은 `use`로 시작합니다.
- test 파일은 대상 파일명에 `.test.ts` 또는 `.test.tsx`를 붙입니다.
- `src/routes/`는 TanStack Router의 file-based routing 규칙을 우선합니다. route tree에서 제외할 colocated 파일과 폴더는 `-` prefix를 사용합니다.
- framework, code generator, 외부 도구가 요구하는 파일명은 예외로 합니다. 예: `__root.tsx`, `routeTree.gen.ts`, `mockServiceWorker.js`.

예시:

```txt
src/lib/auth/auth-errors.ts
src/lib/auth/auth-errors.test.ts
src/lib/i18n/use-translations.ts
src/stores/use-app-store.ts
src/routes/-auth-errors.test.tsx
```

## 커밋 컨벤션

이 프로젝트는 Conventional Commits 형식을 따릅니다.

### 제목

```txt
<type>: <description>
```

- `type`은 소문자로 작성합니다.
- `type` 뒤에는 콜론과 공백을 붙입니다.
- `description`은 영문 소문자로 시작합니다.
- `description`은 명령형 현재시제로 작성합니다.
- 제목 끝에 마침표를 붙이지 않습니다.
- `Co-Authored-By` 시그니처를 사용하지 않습니다.

| type       | 의미                                             |
| ---------- | ------------------------------------------------ |
| `feat`     | 새 기능, 사용자에게 보이는 UI/flow 추가          |
| `fix`      | 버그 수정, 잘못된 UI/상태/API 동작 수정          |
| `refactor` | 동작 변경 없는 구조 개선                         |
| `docs`     | README, PR template, 주석 등 문서 변경           |
| `chore`    | 의존성, shadcn/ui 추가, repo 설정, 기타 유지보수 |
| `test`     | 테스트 추가/수정                                 |
| `ci`       | GitHub Actions, hook, 자동화 변경                |
| `style`    | 포맷팅, CSS class 정리, 시각적 스타일만 변경     |

### 본문

제목만으로 변경 의도가 충분히 전달되지 않을 때 본문을 작성합니다.
제목과 본문 사이에는 빈 줄을 삽입합니다.

```txt
<type>: <description>

- 변경사항 1
- 변경사항 2

Why: 이 변경이 필요한 이유
```

규칙:

- 변경사항은 bullet(`-`)로 나열합니다.
- `Why:` 줄에 변경 동기를 한 줄로 작성합니다.
- 본문 언어는 한국어로 작성합니다.
- 기술 용어는 영어 그대로 사용합니다: route, cache key, fallback, invalidation.
- 단순 변경에는 본문을 생략합니다.

### 예시

```txt
feat: add user profile route

- TanStack Router에 `/profile` route 추가
- profile query key와 loading state 구성
- mobile layout 대응

Why: 사용자가 계정 정보를 확인할 수 있는 화면 필요
```

```txt
fix: handle empty api responses

- API client에서 204, 205 응답을 undefined로 처리
- non-JSON 응답은 text로 반환

Why: body가 없는 성공 응답에서 JSON parse error가 발생하지 않도록 방지
```
