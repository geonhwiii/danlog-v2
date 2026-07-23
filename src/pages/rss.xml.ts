import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const [blogPosts, translationPosts] = await Promise.all([
    getCollection('blog', ({ data }) => !data.draft),
    getCollection('translation', ({ data }) => !data.draft),
  ]);

  const items = [
    ...blogPosts.map((post) => ({ post, link: `/blog/${post.id}/` })),
    ...translationPosts.map((post) => ({ post, link: `/translation/${post.id}/` })),
  ].sort((a, b) => b.post.data.date.valueOf() - a.post.data.date.valueOf());

  return rss({
    title: '단로그',
    description: '개발과 일상의 기록을 담는 개인 블로그.',
    site: context.site!,
    items: items.map(({ post, link }) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link,
    })),
    customData: '<language>ko-KR</language>',
  });
}
