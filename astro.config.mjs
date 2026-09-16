// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypePrettyCode from 'rehype-pretty-code';

/** @type {import('rehype-pretty-code').Options} */
const rehypePrettyCodeOptions = {
  theme: {
    light: 'github-light',
    dark: 'vesper',
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://danlog.vercel.app',
  integrations: [
    react(),
    mdx(),
    // Translations are excluded from the sitemap — they're other people's
    // writing, and /translation/ is disallowed in robots.txt.
    sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/translation') }),
  ],

  markdown: {
    syntaxHighlight: false,
    processor: unified({
      rehypePlugins: [[rehypePrettyCode, rehypePrettyCodeOptions]],
    }),
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
