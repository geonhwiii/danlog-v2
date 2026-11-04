// Save an X post as a snapshot entry in src/content/x/<id>.md.
//
//   bun run x:add https://x.com/<handle>/status/<id>
//
// Uses X's public embed (syndication) endpoint — the same one react-tweet uses.
// Long posts and linked X articles need FxTwitter for their complete text.
// It is unofficial, so the post is fetched once and stored in the repo rather
// than at build time. Add your thoughts under `replies` afterwards.

import { z } from 'astro/zod';

const input = process.argv[2];
const id = input?.match(/(\d{5,})\/?$/)?.[1] ?? input?.match(/status\/(\d+)/)?.[1];
if (!id) {
  console.error('usage: bun run x:add <x.com status url | post id>');
  process.exit(1);
}

const file = `${import.meta.dir}/../src/content/x/${id}.md`;
if (await Bun.file(file).exists()) {
  console.error(`already saved: src/content/x/${id}.md`);
  process.exit(1);
}

const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`);
if (!res.ok) {
  console.error(`fetch failed (${res.status}) — the post may be private or deleted`);
  process.exit(1);
}

interface SyndicationPost {
  id_str: string;
  text: string;
  created_at: string;
  display_text_range: [number, number];
  note_tweet?: { id: string };
  entities?: { urls?: { url: string; expanded_url: string }[] };
  user: {
    name: string;
    screen_name: string;
    profile_image_url_https: string;
    is_blue_verified?: boolean;
    verified?: boolean;
  };
  mediaDetails?: {
    type: 'photo' | 'video' | 'animated_gif';
    media_url_https: string;
    original_info: { width: number; height: number };
  }[];
}

const data = (await res.json()) as SyndicationPost;

// Indices count code points; drop the trailing t.co media link, expand the rest.
const [start, end] = data.display_text_range;
let text = Array.from(data.text).slice(start, end).join('').trim();
for (const u of data.entities?.urls ?? []) text = text.replaceAll(u.url, u.expanded_url);
const media = (data.mediaDetails ?? []).map((m) => ({
  type: m.type === 'photo' ? 'photo' : 'video',
  src: m.media_url_https,
  width: m.original_info.width,
  height: m.original_info.height,
}));
const articleUrl = text.match(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/i\/article\/\d+/)?.[0];

if (data.note_tweet || articleUrl) {
  const fullRes = await fetch(`https://api.fxtwitter.com/${data.user.screen_name}/status/${id}`);
  if (!fullRes.ok) throw new Error(`full post fetch failed (${fullRes.status}); snapshot not saved`);
  const articleMedia = z.object({
    media_info: z.object({
      original_img_url: z.string().url(),
      original_img_width: z.number().positive(),
      original_img_height: z.number().positive(),
    }),
  });
  const { tweet } = z
    .object({
      tweet: z.object({
        id: z.literal(id),
        text: z.string().min(1),
        article: z
          .object({
            title: z.string().min(1),
            content: z.object({ blocks: z.array(z.object({ text: z.string() })).min(1) }),
            cover_media: articleMedia.optional(),
            media_entities: z.array(articleMedia).default([]),
          })
          .optional(),
      }),
    })
    .parse(await fullRes.json());

  if (articleUrl) {
    const article = tweet.article;
    const paragraphs = article?.content.blocks.map((block) => block.text).filter((text) => text.trim());
    if (!article || !paragraphs?.length) throw new Error('article body missing; snapshot not saved');
    const introduction = text.replace(articleUrl, '').trim();
    text = [introduction, article.title, ...paragraphs, articleUrl].filter(Boolean).join('\n\n');
    for (const item of [article.cover_media, ...article.media_entities]) {
      if (!item || media.some((m) => m.src === item.media_info.original_img_url)) continue;
      media.push({
        type: 'photo',
        src: item.media_info.original_img_url,
        width: item.media_info.original_img_width,
        height: item.media_info.original_img_height,
      });
    }
  } else {
    if (tweet.text.length <= text.length) throw new Error('full post text incomplete; snapshot not saved');
    text = tweet.text;
  }
}

const entry = {
  date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()),
  post: {
    id: data.id_str,
    url: `https://x.com/${data.user.screen_name}/status/${data.id_str}`,
    text,
    createdAt: data.created_at,
    author: {
      name: data.user.name,
      handle: data.user.screen_name,
      avatar: data.user.profile_image_url_https.replace('_normal.', '_bigger.'),
      verified: Boolean(data.user.is_blue_verified || data.user.verified),
    },
    media,
  },
  replies: [] as { date: string; text: string }[],
};

// JSON is valid YAML, so the snapshot is written as-is; replies stay easy to edit.
const yaml = [
  `date: ${entry.date}`,
  `post: ${JSON.stringify(entry.post, null, 2)}`,
  `# 내 생각을 스레드처럼 이어서 적는다:`,
  `# replies:`,
  `#   - date: ${entry.date}`,
  `#     text: "..."`,
  `replies: []`,
].join('\n');

await Bun.write(file, `---\n${yaml}\n---\n`);
console.log(`saved src/content/x/${id}.md — @${entry.post.author.handle}: ${text.slice(0, 60)}…`);
