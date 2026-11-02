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

export const collections = { blog, translation };
