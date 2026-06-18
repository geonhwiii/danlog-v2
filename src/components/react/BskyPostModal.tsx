import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Repeat2, X } from 'lucide-react';
import { cn } from '@lib/utils';
import { type BskyPost, type BskyThreadNode, getPostThread } from '@lib/bsky';
import { formatCount, formatFullDate, safeHostname, timeAgo } from '@lib/bskyFormat';
import { QuoteCard } from './BskyFeed.tsx';

interface BskyPostModalProps {
  /** 클릭한 글 — 스레드 로딩 전 즉시 렌더용 */
  post: BskyPost;
  isOpen: boolean;
  close: () => void;
}

export default function BskyPostModal({ post, isOpen, close }: BskyPostModalProps) {
  const [thread, setThread] = useState<BskyThreadNode | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    const ctrl = new AbortController();
    getPostThread(post.uri, ctrl.signal)
      .then((root) => {
        setThread(root);
        setStatus('ok');
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.error('BskyPostModal:', err);
        setStatus('error');
      });
    return () => ctrl.abort();
  }, [post.uri]);

  // Esc 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  // 스레드 루트가 오면 최신 카운트로 교체, 아니면 클릭한 글로 표시
  const root = thread?.post ?? post;

  return (
    <div
      role="presentation"
      onClick={close}
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm transition-opacity sm:p-6',
        isOpen ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bluesky 글"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative my-auto w-full max-w-xl rounded-xl border border-hairline bg-surface-card shadow-sm transition-transform',
          isOpen ? 'translate-y-0' : 'translate-y-2',
        )}
      >
        {/* 상단바 */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-hairline bg-surface-card/95 px-4 py-3 backdrop-blur">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.479 0-.688-.139-1.86-.902-2.203-.659-.299-1.664-.621-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"></path>
          </svg>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="-mr-1.5 rounded-full p-1.5 text-muted transition-colors hover:bg-canvas-soft hover:text-body-strong"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          {/* 원본 글 */}
          <RootPost post={root} />

          {/* 답글 */}
          <div className="border-t border-hairline">
            {status === 'loading' && (
              <div className="space-y-4 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="size-9 shrink-0 animate-pulse rounded-full bg-canvas-soft" />
                    <div className="min-w-0 flex-1">
                      <div className="h-3 w-32 animate-pulse rounded bg-canvas-soft" />
                      <div className="mt-2.5 h-3 w-full animate-pulse rounded bg-canvas-soft" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {status === 'error' && <p className="body-sm p-4 text-center text-muted">답글을 불러오지 못했어요.</p>}

            {status === 'ok' &&
              (thread && thread.replies.length > 0 ? (
                <ul>
                  {thread.replies.map((node) => (
                    <ReplyNode key={node.post.uri} node={node} depth={0} />
                  ))}
                </ul>
              ) : (
                <p className="body-sm p-6 text-center text-muted-soft">아직 답글이 없어요.</p>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 모달 상단의 원본 글 (크게) */
function RootPost({ post }: { post: BskyPost }) {
  const { author } = post;
  const profileUrl = `https://bsky.app/profile/${author.handle}`;

  return (
    <div className="p-4">
      <div className="flex items-center gap-3">
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
          {author.avatar ? (
            <img src={author.avatar} alt="" className="size-11 rounded-full object-cover" />
          ) : (
            <div className="size-11 rounded-full bg-canvas-soft" />
          )}
        </a>
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 leading-tight">
          <span className="block truncate font-semibold text-body-strong">{author.displayName ?? author.handle}</span>
          <span className="block truncate text-[14px] text-muted-soft">@{author.handle}</span>
        </a>
      </div>

      {post.text && (
        <p className="mt-3 whitespace-pre-wrap wrap-break-word text-[17px] leading-relaxed text-body">{post.text}</p>
      )}

      <PostMedia post={post} large />

      <p className="mt-3 text-[13px] text-muted-soft">{formatFullDate(post.createdAt)}</p>

      {/* 통계 */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-hairline pt-3 text-[13px] text-muted">
        {post.repostCount > 0 && (
          <span>
            <strong className="font-semibold text-body-strong">{formatCount(post.repostCount)}</strong> 재게시
          </span>
        )}
        {post.quoteCount > 0 && (
          <span>
            <strong className="font-semibold text-body-strong">{formatCount(post.quoteCount)}</strong> 인용
          </span>
        )}
        {post.likeCount > 0 && (
          <span>
            <strong className="font-semibold text-body-strong">{formatCount(post.likeCount)}</strong> 좋아요
          </span>
        )}
        {post.replyCount > 0 && (
          <span>
            <strong className="font-semibold text-body-strong">{formatCount(post.replyCount)}</strong> 답글
          </span>
        )}
      </div>

      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="caption mt-3 inline-block text-primary-text hover:underline"
      >
        Bluesky에서 보기 ↗
      </a>
    </div>
  );
}

/** 재귀 답글 노드 */
function ReplyNode({ node, depth }: { node: BskyThreadNode; depth: number }) {
  const { post } = node;
  const { author } = post;
  const profileUrl = `https://bsky.app/profile/${author.handle}`;
  // 깊이별 들여쓰기는 일정 단계까지만 (너무 깊어지면 가독성 저하)
  const indented = depth > 0;

  return (
    <li>
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex gap-3 border-t border-hairline p-4 transition-colors hover:bg-canvas-soft/50',
          indented && 'border-l-2 border-l-hairline pl-4',
        )}
      >
        <span
          onClick={(e) => {
            e.preventDefault();
            window.open(profileUrl, '_blank', 'noopener,noreferrer');
          }}
          className="shrink-0"
        >
          {author.avatar ? (
            <img src={author.avatar} alt="" loading="lazy" className="size-9 rounded-full object-cover" />
          ) : (
            <span className="block size-9 rounded-full bg-canvas-soft" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5 text-[14px] leading-tight">
            <span className="truncate font-semibold text-body-strong">{author.displayName ?? author.handle}</span>
            <span className="truncate text-muted-soft">@{author.handle}</span>
            <span className="shrink-0 text-muted-soft">· {timeAgo(post.createdAt)}</span>
          </span>

          {post.text && (
            <span className="mt-1 block whitespace-pre-wrap wrap-break-word text-[14px] leading-normal text-body">
              {post.text}
            </span>
          )}

          <PostMedia post={post} />

          <span className="mt-2 flex items-center gap-6 text-muted-soft">
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <MessageCircle className="size-4" aria-hidden="true" />
              {post.replyCount > 0 && formatCount(post.replyCount)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <Repeat2 className="size-4" aria-hidden="true" />
              {post.repostCount > 0 && formatCount(post.repostCount)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <Heart className="size-4" aria-hidden="true" />
              {post.likeCount > 0 && formatCount(post.likeCount)}
            </span>
          </span>
        </span>
      </a>

      {node.replies.length > 0 && (
        <ul className="ml-4">
          {node.replies.map((child) => (
            <ReplyNode key={child.post.uri} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** 이미지 / 외부 링크 / 인용 — 본문과 답글 공용 */
function PostMedia({ post, large }: { post: BskyPost; large?: boolean }) {
  return (
    <>
      {post.images.length > 0 && (
        <span
          className={cn(
            'mt-2.5 grid gap-1.5 overflow-hidden rounded-lg',
            post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
          )}
        >
          {post.images.map((img) => (
            <img
              key={img.fullsize}
              src={large ? img.fullsize : img.thumb}
              alt={img.alt}
              loading="lazy"
              className={cn(
                'w-full border border-hairline object-cover',
                post.images.length === 1 ? (large ? 'max-h-[600px]' : 'max-h-[360px]') : 'aspect-square',
              )}
            />
          ))}
        </span>
      )}

      {post.external && (
        <a
          href={post.external.uri}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 block overflow-hidden rounded-lg border border-hairline hover:border-hairline-strong"
        >
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
            <span className="caption mt-1.5 block truncate text-muted-soft">{safeHostname(post.external.uri)}</span>
          </span>
        </a>
      )}

      {post.quote && <QuoteCard quote={post.quote} />}
    </>
  );
}
