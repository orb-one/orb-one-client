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

| type       | 의미                                            |
| ---------- | ----------------------------------------------- |
| `feat`     | 새 기능, 사용자에게 보이는 UI/flow 추가         |
| `fix`      | 버그 수정, 잘못된 UI/상태/API 동작 수정         |
| `refactor` | 동작 변경 없는 구조 개선                        |
| `docs`     | README, PR template, 주석 등 문서 변경          |
| `chore`    | 의존성, design system, repo 설정, 기타 유지보수 |
| `test`     | 테스트 추가/수정                                |
| `ci`       | GitHub Actions, hook, 자동화 변경               |
| `style`    | 포맷팅, CSS class 정리, 시각적 스타일만 변경    |

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

## 버전 및 릴리스 정책

이 정책은 `orb-one-client`의 운영 배포 버전에 적용합니다.
[Semantic Versioning 2.0.0](https://semver.org/)의 증가 기준을 사용자 기능과 지원 계약에 적용하고, 버전은 `vMAJOR.MINOR.PATCH` 형식의 Git 태그로 관리합니다. `package.json`에는 `version` 필드를 두지 않습니다.

| 구분    | 증가 기준                                                                                                             | 예시              |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `MAJOR` | 제공하던 기능·공유 URL·저장 데이터·지원 서버 API 계약의 호환성을 깨는 변경                                            | `v1.1.0 → v2.0.0` |
| `MINOR` | 기존 사용 흐름과 계약을 유지하면서 기능·선택 옵션·표시 정보를 추가                                                    | `v1.0.0 → v1.1.0` |
| `PATCH` | 새 기능 없이 오류·레이아웃·성능을 개선하거나 기존 계약에 맞게 동작을 수정. 운영 배포에 포함된 내부 변경도 여기에 해당 | `v1.1.0 → v1.1.1` |

- 마지막 운영 태그부터 배포할 커밋까지의 실제 변경을 기준으로 정합니다. 커밋 제목의 `feat`·`fix` 표기만으로 자동 결정하지 않습니다.
- 여러 종류의 변경을 함께 배포하면 가장 큰 증가 기준을 한 번 적용합니다. `MINOR`를 올리면 `PATCH`를 0으로, `MAJOR`를 올리면 나머지를 0으로 초기화합니다.
- `dev`와 PR 미리보기 배포는 정식 버전을 올리지 않고 커밋 SHA로 구분합니다. 문서·테스트·CI 변경만 있어도 새 커밋을 운영에 배포하면 `PATCH`를 올립니다.

릴리스는 다음 순서로 진행합니다.

1. `dev → main` 릴리스 PR에서 버전과 변경·검증 내용을 정리합니다. 제목은 `chore: release client vX.Y.Z` 형식을 사용합니다.
2. CI와 필수 리뷰 승인을 확인하고 병합한 뒤, 운영 배포와 주요 사용자 흐름을 검증합니다.
3. 검증한 실제 배포 커밋 SHA에 주석 있는 Git 태그 `vX.Y.Z`를 생성하고 원격에 게시합니다. 배포나 검증에 실패하면 정식 태그를 만들지 않습니다.
4. 게시한 태그는 이동·삭제·재사용하지 않습니다. 릴리스 후 수정은 새 버전으로 배포합니다.
