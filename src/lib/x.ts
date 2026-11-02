import { getCollection, type CollectionEntry } from 'astro:content';

export type XEntry = CollectionEntry<'x'>;

/** Visible X entries, newest first by the date Dan added them, then by the post's own time. */
export async function getXEntries(): Promise<XEntry[]> {
  return (await getCollection('x', ({ data }) => data.visible)).sort(
    (a, b) =>
      b.data.date.valueOf() - a.data.date.valueOf() ||
      b.data.post.createdAt.valueOf() - a.data.post.createdAt.valueOf(),
  );
}

/** What a list row shows: Dan's first reply, or the post itself when there is none yet. */
export const summaryOf = (entry: XEntry) => entry.data.replies[0]?.text ?? entry.data.post.text;

const thisYear = new Date().getFullYear();

/** `11월 2일`, or `2025년 11월 2일` outside the current year. */
export const formatShortDate = (d: Date) =>
  new Intl.DateTimeFormat(
    'ko-KR',
    d.getFullYear() === thisYear
      ? { month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'long', day: 'numeric' },
  ).format(d);

export const formatLongDate = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  .format;

export interface Segment {
  text: string;
  href?: string;
}

const TOKEN = /(https?:\/\/\S+|@\w{1,15}|#[\p{L}\p{N}_]+)/gu;

/** Split post text into plain runs and links (URLs, @mentions, #hashtags). */
export function linkify(text: string): Segment[] {
  return text
    .split(TOKEN)
    .filter(Boolean)
    .map((part) => {
      if (/^https?:\/\//.test(part)) {
        return { text: part.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), href: part };
      }
      if (part.startsWith('@')) return { text: part, href: `https://x.com/${part.slice(1)}` };
      if (part.startsWith('#'))
        return { text: part, href: `https://x.com/hashtag/${encodeURIComponent(part.slice(1))}` };
      return { text: part };
    });
}
