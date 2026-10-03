# 자산과 외부 저작물

[MIT 라이선스](./LICENSE)는 Orb One 기여자가 직접 작성한 코드와 문서에 적용됩니다. 외부 소프트웨어, 글꼴, 이미지와 로고는 각 권리자의 라이선스와 이용 조건을 따릅니다.

## 이미지와 로고

다음 자산은 MIT 라이선스 적용 대상에서 제외합니다.

- `public/brand/`, `src/assets/landing/`: Orb One 브랜드 이미지와 화면 이미지
- `src/assets/providers/`: Baekjoon Online Judge, Programmers, SW Expert Academy, JUNGOL 로고
- `public/icons.svg`: Bluesky, Discord, GitHub, X 등의 로고

로고와 상표의 권리는 각 권리자에게 있습니다.

## 외부 소프트웨어와 글꼴

운영 의존성과 정적 배포물에 포함되는 외부 소프트웨어의 저작권 및 라이선스 원문은 [`public/THIRD_PARTY_LICENSES.txt`](./public/THIRD_PARTY_LICENSES.txt)에 정리했습니다. 이 파일은 빌드 결과에도 `/THIRD_PARTY_LICENSES.txt`로 포함됩니다.

- Geist 글꼴 파일은 SIL Open Font License 1.1을 따릅니다.
- `public/mockServiceWorker.js`는 MSW가 생성한 파일이며 MSW의 MIT 라이선스를 따릅니다.
- 나머지 운영 의존성은 고지 파일에 기재된 MIT, ISC, BSD 또는 Unlicense 조건을 따릅니다.

고지 파일은 `pnpm licenses:generate`로 생성하고 `pnpm licenses:check`로 현재 의존성과 일치하는지 검사합니다.
