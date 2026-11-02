---
name: danlog
description: A reading-first personal blog modeled on leerob.com. One narrow serif column, near-black ink on white (warm near-black in dark mode, following the OS), hairline rules, no accent color. Small sans-serif labels carry dates and UI; IoskeleyMono carries every code surface.

colors:
  light:
    canvas: "#ffffff"
    canvas-soft: "#fafaf8"
    surface-strong: "#efeee9"
    hairline: "#e7e6e2"
    hairline-strong: "#d3d1cb"
    ink: "#1a1a19"
    body: "#2b2b29"
    muted: "#6f6e6a"
    link: "#64635f"
  dark:
    canvas: "#1b1a19"
    canvas-soft: "#1f1e1c"
    surface-strong: "#2a2826"
    hairline: "#34322f"
    hairline-strong: "#45423e"
    ink: "#f3f0ea"
    body: "#e2ded6"
    muted: "#a29e96"
    link: "#b3aea6"

typography:
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Noto Serif KR', 'AppleMyungjo', serif"
  sans: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
  mono: "'IoskeleyMono', 'Pretendard', ui-monospace, monospace"
  handle: { family: serif, size: 36px, weight: 600 }
  post-title: { family: serif, size: "24–28px", weight: 600, lineHeight: 1.35 }
  section-title: { family: serif, size: 24px, weight: 600 }
  body: { family: serif, size: 16px, lineHeight: 1.8 }
  label: { family: sans, size: 14px }
  code: { family: mono, size: 13px, lineHeight: 1.6 }

layout:
  home-column: 600px
  post-column: 600px
  illustration: "340×650, sticky, ≥960px only"
---

# 단로그 디자인

## 원칙

- 글이 주인공이다. 장식, 카드, 그림자, 강조색을 쓰지 않는다.
- 본문은 16px, 줄간격 1.8. 한 줄 너비는 홈·글 모두 600px(한글 약 37자).
- 본문은 세리프. 영문은 Iowan Old Style, 한글은 Noto Serif KR이 받는다.
- 날짜·소개 라벨·푸터 같은 작은 UI 글자만 산세리프(Pretendard)를 쓴다.
- 다크 모드는 OS 설정을 따른다. 토글은 없다.

## 화면

**홈** — `@Dan` → "소개" 라벨과 헤어라인 → 짧은 소개 → "글" 목록(행마다 헤어라인, 제목 왼쪽·`2026년 9월` 오른쪽, 모바일에서는 세로로 쌓임) → 푸터(`© Dan` / RSS · GitHub). 그림(`site.illustration`)을 지정하면 960px 이상에서 오른쪽에 고정 표시된다.

**글 상세** — 제목 → 아바타 · 월 · `Dan`(홈 링크) → 본문 → 헤어라인 위 푸터(`← 모든 글` / RSS · GitHub).

## 링크

기본은 같은 색 글자에 32% 투명도 밑줄, hover 시 밑줄이 진해진다. 본문(`.prose`) 링크는 `link` 회색, hover 시 `ink`. 목록 행은 hover 때만 제목에 밑줄.

## 코드

rehype-pretty-code(github-light / vesper) 유지. 제목 바 또는 언어 라벨 + 오른쪽 Copy 버튼, 헤어라인 테두리, 12px 모서리, `{1,3-5}` 줄 강조는 6% ink 배경 + 2px 회색 안쪽 선. 인라인 코드는 `surface-strong` 배경.
