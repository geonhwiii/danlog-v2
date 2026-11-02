// Save an X post as a snapshot entry in src/content/x/<id>.md.
//
//   bun run x:add https://x.com/<handle>/status/<id>
//
// Uses X's public embed (syndication) endpoint — the same one react-tweet uses.
// It is unofficial, so the post is fetched once and stored in the repo rather
// than at build time. Add your thoughts under `replies` afterwards.

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

const entry = {
  date: new Date().toISOString().slice(0, 10),
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
    media: (data.mediaDetails ?? []).map((m) => ({
      type: m.type === 'photo' ? 'photo' : 'video',
      src: m.media_url_https,
      width: m.original_info.width,
      height: m.original_info.height,
    })),
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
