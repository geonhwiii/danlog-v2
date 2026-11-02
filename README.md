# 단로그 (danlog)

기록하는 개발자의 개인 블로그. 개발과 관련된 코드·생각을 정리해 공유합니다.

🔗 https://danlog.vercel.app

![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)
[![MotionScore](https://api.motion.dev/score/badge?url=danlog.vercel.app)](https://score.motion.dev/site/danlog.vercel.app)
[![Pagespeed](https://img.shields.io/badge/pagespeed-100-brightgreen)](https://pagespeed.web.dev/analysis?url=https://danlog.vercel.app)

## Lighthouse

<img src="docs/lighthouse-score.png" alt="Lighthouse 점수 — Performance 100, Accessibility 100, Best Practices 100, SEO 100" width="600" />

## Motion

<img src="https://i.imgur.com/XLWzgLw.png" alt="Motion Score S" width="600" />



## 기술 스택

- **Astro** — 정적 사이트 생성, 콘텐츠 컬렉션 기반 블로그
- **React** — 커스텀 컴포넌트
- **Tailwind CSS v4** — 디자인 토큰 기반 스타일링 (라이트/다크는 OS 설정을 따름)
- **MDX** + rehype-pretty-code — 마크다운 글 작성, 코드 하이라이팅
- **bun** — 패키지 매니저 / 런타임
- **oxlint · oxfmt** — 린트 / 포매팅

## 명령어

| 명령어            | 설명                         |
| :---------------- | :--------------------------- |
| `bun install`     | 의존성 설치                  |
| `bun run dev`     | 개발 서버 (`localhost:4321`) |
| `bun run build`   | 프로덕션 빌드 (`./dist/`)    |
| `bun run preview` | 빌드 결과 로컬 미리보기      |
| `bun run lint`    | oxlint 검사                  |
| `bun run fmt:fix` | oxfmt 포매팅 적용            |

## 구조

```text
src/
├── components/        # Astro 컴포넌트 + react/ (MDX용 Alert·Image·Video 등)
├── content/blog/      # 블로그 글 (Markdown / MDX)
├── layouts/           # 공통 레이아웃
├── lib/               # 유틸 (markdown 헬퍼 등)
├── pages/             # 라우트 (홈, 글, rss, robots.txt). `_`로 시작하는 파일은 라우트에서 제외된 보관본
├── shared/constants/  # 사이트 정보(site.ts)·프로필 콘텐츠 상수
└── styles/            # 전역 CSS / 디자인 토큰
```

## 글 작성

`src/content/blog/<글-제목>/index.md`(또는 `.mdx`)로 추가합니다. frontmatter:

```yaml
---
title: '제목'
description: '한 줄 설명'
date: 2026-01-01
tags: ['React', 'TypeScript']
visible: true # false면 목록·라우트·RSS에서 숨김 (기본값 true)
---
```

## X 글 추가

X 글을 링크로 저장하고, 그 아래에 내 생각을 스레드처럼 남깁니다. 홈의 `X` 섹션에서 항목을 누르면 `/x/<id>` 상세로 이동하고, 그 글의 카드 아래로 이전 글 카드들이 피드처럼 이어집니다.

```bash
bun run x:add https://x.com/<handle>/status/<id>
```

`src/content/x/<id>.md`에 원글 스냅샷(작성자, 본문, 이미지)이 저장됩니다. 원글이 지워져도 그대로 보입니다. 같은 파일의 `replies`에 내 생각을 적습니다:

```yaml
replies:
  - date: 2026-11-02
    text: '첫 번째 생각'
  - date: 2026-11-03
    text: '이어서 덧붙이는 생각'
```

답글이 없으면 목록에는 원글 본문이 보입니다. `visible: false`로 숨길 수 있습니다.
