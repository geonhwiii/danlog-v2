# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

한국어를 읽는 개발자(주로 프론트엔드)와, 작성자 정건휘를 알아보러 온 동료·채용 담당자. 검색이나 링크로 글 한 편에 도착해 끝까지 읽거나, 홈에서 작성자가 누구이고 무엇을 쓰는지 빠르게 파악한다.

## Product Purpose

단로그(danlog)는 프론트엔드 엔지니어 정건휘의 개인 블로그다. 개발과 관련된 코드·생각을 정리해 공유한다. 성공은 글이 끝까지 편하게 읽히는 것, 그리고 홈에서 작성자와 글 목록이 한눈에 들어오는 것이다.

## Positioning

장식 없는 개인 기록장. 사이트 자체보다 글이 앞에 선다. 리뉴얼은 leerob.com을 벤치마크로 삼아 극도로 단순하고 가독성이 뛰어난 구성을 지향한다(사용자가 명시한 기준).

## Capabilities and Constraints

- 노출 페이지: 홈(짧은 소개 + 날짜순 글 목록), 글 상세. 홈에는 별도 Notes/고정 주제 섹션을 두지 않는다.
- 프로필/이력(`/profile`), 번역(`/translation`), 피드(`/feed`)는 라우트에서 제외하되 코드는 보관한다.
- 글 노출은 frontmatter `visible`(기본 true)로 제어한다. `visible: false`인 글은 목록·라우트·RSS·검색에서 빠지고 파일만 보관된다. 리뉴얼 시점에는 최근 4편만 노출하고 나머지 42편은 숨긴다.
- 코드 블록 기능(제목 바, 언어 표시, 복사 버튼, 라인 하이라이트, 라이트/다크 테마)과 코드 폰트 IoskeleyMono는 그대로 유지한다.
- 스택: Astro + MDX + Tailwind v4 + React(필요한 곳만), bun, Vercel 배포. 기술 스택은 최신화 예정.
- 콘텐츠는 한국어 중심, 코드 블록 다수(rehype-pretty-code/shiki).
- 회사(밀리의서재) 디자인 시스템은 사용하지 않는다.

## Brand Commitments

- 이름: 단로그 / danlog. 작성자: 정건휘(@geonhwiii), 프론트엔드 엔지니어, 현재 kt 밀리의서재 재직.
- 기존 DESIGN.md(Cursor 분석 기반)와 현재 화면은 리뉴얼에서 대체 대상이다.

## Evidence on Hand

- 소개 문구: `src/shared/constants/profile.ts`의 `profile.intro`.
- 연락처: gunw.dan@gmail.com, GitHub https://github.com/geonhwiii, LinkedIn https://www.linkedin.com/in/gunwww.
- 소개는 짧게 유지한다. 회사명과 연락처 링크(GitHub, LinkedIn, 메일)는 소개 문단에 넣지 않는다. 문구는 작성자가 직접 다듬는다. 푸터에는 RSS와 GitHub 링크를 둔다.
- 공개 글이 0편이 될 수 있다. 홈은 빈 목록 상태를 견뎌야 한다.

## Product Principles

1. 글이 주인공이다. 읽기를 방해하는 요소는 넣지 않는다.
2. 적게 보여주고 빨리 도달하게 한다.
3. 한국어 본문 가독성을 최우선 기준으로 판단한다.
4. 숨긴 것은 지우지 않는다. 보관과 노출을 분리한다.

## Accessibility & Inclusion

기존 사이트는 Lighthouse 접근성 100을 유지해 왔다. 같은 수준을 유지한다.
