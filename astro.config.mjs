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
  // The home page is the post list now. Hidden sections (pages prefixed with
  // `_` in src/pages) send old links home instead of 404ing.
  redirects: {
    '/blog': '/',
    '/profile': '/',
    '/feed': '/',
    '/translation': '/',
    // X entries open in place on the home page; only /x/<id> share links remain.
    '/x': '/#x',
  },
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
