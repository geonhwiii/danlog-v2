import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { toYmd } from '@lib/markdown';

// Build-time search index: minimal post metadata (title/description/tags),
// emitted as /search-index.json and fetched client-side by the search palette.
export const GET: APIRoute = async () => {
  const [blogPosts, translationPosts] = await Promise.all([
    getCollection('blog', ({ data }) => !data.draft),
    getCollection('translation', ({ data }) => !data.draft),
  ]);

  const posts = [
    ...blogPosts.map((post) => ({ post, href: `/blog/${post.id}` })),
    ...translationPosts.map((post) => ({ post, href: `/translation/${post.id}` })),
  ].sort((a, b) => b.post.data.date.valueOf() - a.post.data.date.valueOf());

  const index = posts.map(({ post, href }) => ({
    id: post.id,
    href,
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    date: toYmd(post.data.date),
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
};
