import { getCollection, type CollectionEntry } from 'astro:content';

export type XEntry = CollectionEntry<'x'>;

/** Visible X entries, newest first by the original post's timestamp. */
export async function getXEntries(): Promise<XEntry[]> {
  return (await getCollection('x', ({ data }) => data.visible)).sort(
    (a, b) => b.data.post.createdAt.valueOf() - a.data.post.createdAt.valueOf(),
  );
}

/** List summaries prefer Dan's first reply, then the Korean translation, then the original. */
export const summaryOf = (entry: XEntry) =>
  entry.data.replies[0]?.text ?? entry.data.post.textKo ?? entry.data.post.text;

const timeZone = 'Asia/Seoul';
const yearOf = (d: Date) => new Intl.DateTimeFormat('en', { year: 'numeric', timeZone }).format(d);
const thisYear = yearOf(new Date());

/** `11월 2일`, or `2025년 11월 2일` outside the current year. */
export const formatShortDate = (d: Date) =>
  new Intl.DateTimeFormat(
    'ko-KR',
    yearOf(d) === thisYear
      ? { month: 'long', day: 'numeric', timeZone }
      : { year: 'numeric', month: 'long', day: 'numeric', timeZone },
  ).format(d);

export const formatLongDate = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone,
}).format;

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
