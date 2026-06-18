import { useEffect, useState } from 'react';
import { cn } from '@lib/utils';
import { type BskyAuthor, getListMembers } from '@lib/bsky';

interface BskyMembersProps {
  /** at://<did>/app.bsky.graph.list/<rkey> */
  listUri: string;
  className?: string;
}

export default function BskyMembers({ listUri, className }: BskyMembersProps) {
  const [members, setMembers] = useState<BskyAuthor[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus('loading');
    getListMembers(listUri, 50, ctrl.signal)
      .then((list) => {
        setMembers(list);
        setStatus('ok');
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.error('BskyMembers:', err);
        setStatus('error');
      });
    return () => ctrl.abort();
  }, [listUri]);

  if (status === 'error') return null;

  return (
    <div className={cn('-mx-4 overflow-x-auto px-4 pt-2 pb-4 scrollbar-none [&::-webkit-scrollbar]:hidden', className)}>
      <ul className="flex gap-6">
        {status === 'loading'
          ? Array.from({ length: 10 }).map((_, i) => (
              <li key={i} className="flex w-[72px] shrink-0 flex-col items-center gap-2.5">
                <div className="size-[72px] animate-pulse rounded-full bg-canvas-soft" />
                <div className="h-2.5 w-12 animate-pulse rounded bg-canvas-soft" />
              </li>
            ))
          : members.map((m) => (
              <li key={m.did} className="shrink-0">
                <a
                  href={`https://bsky.app/profile/${m.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex w-[72px] flex-col items-center gap-2.5"
                  title={m.displayName ?? m.handle}
                >
                  {/* 인스타그램 스타일 그라데이션 링 — 브랜드 오렌지에서 시작 */}
                  <span className="rounded-full bg-linear-to-tr from-[#f54e00] via-rose-500 to-fuchsia-600 p-[2.5px] transition-transform group-hover:scale-105">
                    <span className="block rounded-full bg-surface-card p-[2.5px]">
                      {m.avatar ? (
                        <img src={m.avatar} alt="" loading="lazy" className="size-16 rounded-full object-cover" />
                      ) : (
                        <span className="block size-16 rounded-full bg-canvas-soft" />
                      )}
                    </span>
                  </span>
                  <span className="caption w-full truncate text-center text-muted group-hover:text-body-strong">
                    {m.displayName ?? m.handle}
                  </span>
                </a>
              </li>
            ))}
      </ul>
    </div>
  );
}
