import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const id = '2117953152376799498';
const preview = 'So readability now comes down to:';
const complete = `${preview}\n\nThe rest of the long post, including its final takeaway.`;

const articleUrl = 'https://x.com/i/article/2017338533850042368';
const article = {
  title: 'Code review is now a data problem',
  content: { blocks: [{ text: 'The full article introduction.' }, { text: 'The final article paragraph.' }] },
  cover_media: {
    media_info: {
      original_img_url: 'https://pbs.twimg.com/cover.jpg',
      original_img_width: 4096,
      original_img_height: 1639,
    },
  },
};

async function savePost(long: boolean, fullText: string | null = complete, articlePost = false, includeArticle = true) {
  const root = await mkdtemp(join(tmpdir(), 'danlog-x-add-'));
  try {
    await mkdir(join(root, 'scripts'));
    await symlink(join(import.meta.dir, '../node_modules'), join(root, 'node_modules'));
    await mkdir(join(root, 'src/content/x'), { recursive: true });
    await Bun.write(join(root, 'scripts/x-add.ts'), Bun.file(join(import.meta.dir, 'x-add.ts')));
    const embed = {
      id_str: id,
      text: articlePost ? articleUrl : preview,
      display_text_range: [0, (articlePost ? articleUrl : preview).length],
      created_at: '2026-11-04T12:12:35.000Z',
      user: { name: 'Matt Pocock', screen_name: 'mattpocockuk', profile_image_url_https: '' },
      ...(long ? { note_tweet: { id: 'note-id' } } : {}),
    };
    await Bun.write(
      join(root, 'mock.ts'),
      `
      globalThis.fetch = async (url) => {
        if (String(url).includes('cdn.syndication.twimg.com')) {
          return Response.json(${JSON.stringify(embed)});
        }
        return Response.json(${JSON.stringify({ tweet: { id, text: fullText, ...(articlePost && includeArticle ? { article } : {}) } })});
      };
    `,
    );
    const result = Bun.spawn({
      cmd: [process.execPath, '--preload', './mock.ts', './scripts/x-add.ts', id],
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const exitCode = await result.exited;
    const file = Bun.file(join(root, `src/content/x/${id}.md`));
    return { exitCode, saved: (await file.exists()) ? await file.text() : null };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('saves the complete long post instead of the embed preview', async () => {
  const result = await savePost(true);
  expect(result.exitCode).toBe(0);
  expect(result.saved).toContain(JSON.stringify(complete));
});

test('does not save a truncated long post when full text is unavailable', async () => {
  const result = await savePost(true, null);
  expect(result.exitCode).not.toBe(0);
  expect(result.saved).toBeNull();
});

test('ordinary posts can still be saved from the embed response', async () => {
  const result = await savePost(false);
  expect(result.exitCode).toBe(0);
  expect(result.saved).toContain(JSON.stringify(preview));
});

test('saves a linked article in full even when the post is not a note tweet', async () => {
  const result = await savePost(false, articleUrl, true);
  expect(result.exitCode).toBe(0);
  expect(result.saved).toContain(article.title);
  expect(result.saved).toContain('The final article paragraph.');
  expect(result.saved).toContain('https://pbs.twimg.com/cover.jpg');
});

test('does not silently save only an article link when the article is unavailable', async () => {
  const result = await savePost(false, articleUrl, true, false);
  expect(result.exitCode).not.toBe(0);
  expect(result.saved).toBeNull();
});
