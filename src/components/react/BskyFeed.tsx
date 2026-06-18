import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { cn } from '@lib/utils';
import { type BskyPost, getListFeed } from '@lib/bsky';

interface BskyFeedProps {
  /** at://<did>/app.bsky.graph.list/<rkey> */
  listUri: string;
  limit?: number;
  /** 이 일수 이내에 작성된 글만 노출 (기본 14일) */
  maxAgeDays?: number;
  className?: string;
}

/** bsky 스타일의 짧은 상대시간: "3분", "7시간", "2일", 그 이상은 날짜 */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return `${Math.max(diffSec, 0)}초`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}일`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

export default function BskyFeed({ listUri, limit = 30, maxAgeDays = 14, className }: BskyFeedProps) {
  const [posts, setPosts] = useState<BskyPost[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus('loading');
    const cutoff = Date.now() - maxAgeDays * 86400 * 1000;
    getListFeed(listUri, limit, ctrl.signal)
      .then((feed) => {
        setPosts(feed.filter((p) => new Date(p.createdAt).getTime() >= cutoff));
        setStatus('ok');
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.error('BskyFeed:', err);
        setStatus('error');
      });
    return () => ctrl.abort();
  }, [listUri, limit, maxAgeDays]);

  // CSS columns 기반 masonry: 화면 폭에 따라 1→2열, 카드는 컬럼 사이에서 쪼개지지 않음.
  const masonry = 'columns-1 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid';

  if (status === 'loading') {
    return (
      <div className={cn(masonry, className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-hairline bg-surface-card p-4">
            <div className="flex gap-3">
              <div className="size-10 shrink-0 animate-pulse rounded-full bg-canvas-soft" />
              <div className="min-w-0 flex-1">
                <div className="h-3 w-40 animate-pulse rounded bg-canvas-soft" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-canvas-soft" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-canvas-soft" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={cn('rounded-lg border border-hairline bg-surface-card p-6 text-center', className)}>
        <p className="body-sm text-muted">피드를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={cn('rounded-lg border border-hairline bg-surface-card p-6 text-center', className)}>
        <p className="body-sm text-muted">최근 {maxAgeDays}일 동안 올라온 글이 없어요.</p>
      </div>
    );
  }

  return (
    <div className={cn(masonry, className)}>
      {posts.map((post) => (
        <Post key={post.uri} post={post} />
      ))}
    </div>
  );
}

function Post({ post }: { post: BskyPost }) {
  const { author } = post;
  const profileUrl = `https://bsky.app/profile/${author.handle}`;

  return (
    <article className="rounded-lg border border-hairline bg-surface-card transition-colors hover:border-hairline-strong">
      <a href={post.url} target="_blank" rel="noopener noreferrer" className="block p-4">
        {post.repostedBy && (
          <p className="caption mb-1.5 flex items-center gap-1.5 pl-13 text-muted-soft">
            <Repeat2 className="size-3.5" aria-hidden="true" />
            <span className="truncate">{post.repostedBy.displayName ?? post.repostedBy.handle} 님이 리포스트</span>
          </p>
        )}

        <div className="flex gap-3">
          <span
            className="shrink-0"
            onClick={(e) => {
              e.preventDefault();
              window.open(profileUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            {author.avatar ? (
              <img src={author.avatar} alt="" className="size-10 rounded-full object-cover" loading="lazy" />
            ) : (
              <div className="size-10 rounded-full bg-canvas-soft" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 text-[15px] leading-tight">
              <span className="truncate font-semibold text-body-strong">{author.displayName ?? author.handle}</span>
              <span className="truncate text-muted-soft">@{author.handle}</span>
              <span className="shrink-0 text-muted-soft">· {timeAgo(post.createdAt)}</span>
            </div>

            {post.text && (
              <p className="mt-1 whitespace-pre-wrap wrap-break-word text-[15px] leading-normal text-body">
                {post.text}
              </p>
            )}

            {post.images.length > 0 && (
              <div
                className={cn(
                  'mt-2.5 grid gap-1.5 overflow-hidden rounded-lg',
                  post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
                )}
              >
                {post.images.map((img) => (
                  <img
                    key={img.fullsize}
                    src={img.thumb}
                    alt={img.alt}
                    loading="lazy"
                    className={cn(
                      'w-full border border-hairline object-cover',
                      post.images.length === 1 ? 'max-h-[510px]' : 'aspect-square',
                    )}
                  />
                ))}
              </div>
            )}

            {post.external && (
              <span className="mt-2.5 block overflow-hidden rounded-lg border border-hairline">
                {post.external.thumb && (
                  <img
                    src={post.external.thumb}
                    alt=""
                    loading="lazy"
                    className="aspect-[1.91/1] w-full border-b border-hairline object-cover"
                  />
                )}
                <span className="block p-3">
                  <span className="block truncate text-[14px] font-medium text-body-strong">{post.external.title}</span>
                  {post.external.description && (
                    <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">
                      {post.external.description}
                    </span>
                  )}
                  <span className="caption mt-1.5 block truncate text-muted-soft">
                    {safeHostname(post.external.uri)}
                  </span>
                </span>
              </span>
            )}

            {post.quote && (
              <span className="mt-2.5 block overflow-hidden rounded-lg border border-hairline p-3">
                <span className="flex items-center gap-1.5 text-[13px] leading-tight">
                  {post.quote.author.avatar ? (
                    <img
                      src={post.quote.author.avatar}
                      alt=""
                      loading="lazy"
                      className="size-4 rounded-full object-cover"
                    />
                  ) : (
                    <span className="size-4 rounded-full bg-canvas-soft" />
                  )}
                  <span className="truncate font-semibold text-body-strong">
                    {post.quote.author.displayName ?? post.quote.author.handle}
                  </span>
                  <span className="truncate text-muted-soft">@{post.quote.author.handle}</span>
                </span>
                {post.quote.text && (
                  <span className="mt-1 block whitespace-pre-wrap wrap-break-word text-[14px] leading-snug text-body">
                    {post.quote.text}
                  </span>
                )}
                {post.quote.images.length > 0 && (
                  <span
                    className={cn(
                      'mt-2 grid gap-1.5 overflow-hidden rounded-md',
                      post.quote.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
                    )}
                  >
                    {post.quote.images.map((img) => (
                      <img
                        key={img.fullsize}
                        src={img.thumb}
                        alt={img.alt}
                        loading="lazy"
                        className={cn(
                          'w-full border border-hairline object-cover',
                          post.quote!.images.length === 1 ? 'max-h-[360px]' : 'aspect-square',
                        )}
                      />
                    ))}
                  </span>
                )}
              </span>
            )}

            <div className="mt-2.5 flex items-center gap-8 text-muted-soft">
              <span className="inline-flex items-center gap-1.5 text-[13px]">
                <MessageCircle className="size-[18px]" aria-hidden="true" />
                {post.replyCount > 0 && formatCount(post.replyCount)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px]">
                <Repeat2 className="size-[18px]" aria-hidden="true" />
                {post.repostCount > 0 && formatCount(post.repostCount)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px]">
                <Heart className="size-[18px]" aria-hidden="true" />
                {post.likeCount > 0 && formatCount(post.likeCount)}
              </span>
            </div>
          </div>
        </div>
      </a>
    </article>
  );
}

function safeHostname(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
