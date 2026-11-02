import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // false면 목록·라우트·RSS·검색에서 빠지고 파일만 보관된다.
    visible: z.boolean().default(true),
  }),
});

const translation = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/translation' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    source: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

// X posts Dan keeps, with Dan's own replies underneath. `post` is a snapshot
// saved by `bun run x:add` so a deleted or edited post still renders.
const x = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/x' }),
  schema: z.object({
    date: z.coerce.date(),
    post: z.object({
      id: z.string(),
      url: z.string().url(),
      text: z.string(),
      createdAt: z.coerce.date(),
      author: z.object({
        name: z.string(),
        handle: z.string(),
        avatar: z.string().url(),
        verified: z.boolean().default(false),
      }),
      media: z
        .array(
          z.object({
            type: z.enum(['photo', 'video']),
            src: z.string().url(),
            width: z.number(),
            height: z.number(),
          }),
        )
        .default([]),
    }),
    replies: z.array(z.object({ date: z.coerce.date(), text: z.string() })).default([]),
    visible: z.boolean().default(true),
  }),
});

export const collections = { blog, translation, x };
