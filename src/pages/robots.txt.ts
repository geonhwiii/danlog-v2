import type { APIRoute } from 'astro';

// Dynamic robots.txt — the sitemap URL is built from the `site` config so it
// stays correct across environments.
//
// /translation/* is off-limits to crawlers: those posts are translations of
// other people's writing, so they shouldn't be indexed or scraped for training
// data. Well-behaved search crawlers honour the Disallow below; the AI
// crawlers listed after it are blocked outright from the whole site path set
// they'd use for the translation feed. Bots that ignore robots.txt still hit
// the `noindex` meta tag and the `X-Robots-Tag` header served on those pages.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'Google-Extended',
  'CCBot',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot-Extended',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'FacebookBot',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'Timpibot',
  'cohere-ai',
  'YouBot',
];

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = new URL('sitemap-index.xml', site).href;

  const aiBlocks = AI_CRAWLERS.map((agent) => `User-agent: ${agent}\nDisallow: /translation\n`).join('\n');

  const body = `User-agent: *
Disallow: /translation

${aiBlocks}
Sitemap: ${sitemapUrl}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
