/** Bluesky 피드/스레드 렌더링용 공통 포맷 헬퍼 */

/** bsky 스타일의 짧은 상대시간: "3분", "7시간", "2일", 그 이상은 날짜 */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return `${Math.max(diffSec, 0)}초`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}일`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

/** "2026. 6. 18 · 오전 1:11" 형태의 전체 시각 */
export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** 1000 이상은 K 접미사 (예: 2.3K, 12K) */
export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

export function safeHostname(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
