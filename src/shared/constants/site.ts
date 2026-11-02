// Site-wide identity shown on the home page, post bylines and the footer.

export const site = {
  handle: '@Dan',
  author: 'Dan',
  bio: '프론트엔드 엔지니어 정건휘입니다. 읽기 쉬운 코드와 더 나은 추상화를 고민하고, 배운 것을 이곳에 기록합니다.',
  githubUrl: 'https://github.com/geonhwiii',
  avatarUrl: 'https://github.com/geonhwiii.png?size=64',
  // Portrait illustration beside the home column (shown from 960px up).
  // Put the file in /public and set { src, alt } to show it.
  illustration: null as { src: string; alt: string } | null,
};
