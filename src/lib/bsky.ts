/**
 * Bluesky(AT Protocol) 공개 AppView 클라이언트.
 *
 * 인증/토큰 불필요 — `public.api.bsky.app`는 공개 데이터에 한해
 * 누구나, CORS 허용 상태로 호출할 수 있습니다.
 * 여러 메인테이너를 묶으려면 bsky.app에서 List를 하나 만들고
 * 그 List의 AT-URI를 getListFeed에 넘기면 됩니다.
 *
 * List AT-URI 찾는 법:
 *   1) bsky.app에서 리스트를 연다 → URL이
 *      https://bsky.app/profile/<handle>/lists/<rkey> 형태
 *   2) AT-URI는 at://<did>/app.bsky.graph.list/<rkey>
 *      - <handle>의 did는 resolveHandle()로 얻을 수 있음(아래 헬퍼).
 */

const APPVIEW = 'https://public.api.bsky.app/xrpc';

export interface BskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface BskyImage {
  thumb: string;
  fullsize: string;
  alt: string;
}

export interface BskyExternal {
  uri: string;
  title: string;
  description: string;
  thumb?: string;
}

/** 인용 리포스트(quote post)에 인용된 원본 글 */
export interface BskyQuote {
  author: BskyAuthor;
  text: string;
  images: BskyImage[];
  /** bsky.app 웹 퍼머링크 */
  url: string;
}

export interface BskyPost {
  /** at:// URI */
  uri: string;
  cid: string;
  author: BskyAuthor;
  text: string;
  createdAt: string;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  quoteCount: number;
  images: BskyImage[];
  external?: BskyExternal;
  /** 인용 리포스트인 경우, 인용된 원본 글 */
  quote?: BskyQuote;
  /** 리포스트인 경우, 리포스트한 사람 */
  repostedBy?: BskyAuthor;
  /** 리포스트인 경우, 리포스트된 시각(reason.indexedAt). 정렬·필터 기준. */
  repostedAt?: string;
  /** bsky.app 웹 퍼머링크 */
  url: string;
}

interface RawImageView {
  thumb: string;
  fullsize: string;
  alt?: string;
}

interface RawExternalView {
  uri: string;
  title: string;
  description: string;
  thumb?: string;
}

/** app.bsky.embed.record#viewRecord — 인용된 원본 글의 뷰 */
interface RawViewRecord {
  $type?: string;
  uri?: string;
  cid?: string;
  author?: BskyAuthor;
  value?: { text?: string; createdAt?: string };
  /** 인용된 글 자신의 임베드(이미지 등) */
  embeds?: RawEmbed[];
}

interface RawEmbed {
  $type: string;
  images?: RawImageView[];
  external?: RawExternalView;
  /** record#view → viewRecord, recordWithMedia#view → record#view */
  record?: RawViewRecord & { record?: RawViewRecord };
  /** recordWithMedia#view의 미디어 파트 */
  media?: { $type?: string; images?: RawImageView[]; external?: RawExternalView };
}

interface RawPost {
  uri: string;
  cid: string;
  author: BskyAuthor;
  record: { text?: string; createdAt?: string };
  embed?: RawEmbed;
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  quoteCount?: number;
  indexedAt?: string;
}

interface RawFeedItem {
  post: RawPost;
  reason?: {
    $type: string;
    by?: BskyAuthor;
    indexedAt?: string;
  };
}

interface FeedResponse {
  feed: RawFeedItem[];
  cursor?: string;
}

/** at:// URI를 bsky.app 웹 링크로 변환 */
function postUrl(uri: string, handle: string): string {
  const rkey = uri.split('/').pop() ?? '';
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

function mapImages(raw?: RawImageView[]): BskyImage[] {
  return raw?.map((i) => ({ thumb: i.thumb, fullsize: i.fullsize, alt: i.alt ?? '' })) ?? [];
}

function mapExternal(raw?: RawExternalView): BskyExternal | undefined {
  return raw ? { uri: raw.uri, title: raw.title, description: raw.description, thumb: raw.thumb } : undefined;
}

/** 인용된 원본 글(viewRecord)을 BskyQuote로 변환 */
function mapQuote(rec?: RawViewRecord): BskyQuote | undefined {
  // viewNotFound / viewBlocked 등은 author·value가 없으므로 건너뜀
  if (!rec?.author || !rec.uri) return undefined;
  // 인용된 글 자신의 이미지(첫 images#view 임베드에서)
  const innerImages = rec.embeds?.flatMap((e) => mapImages(e.images ?? e.media?.images)) ?? [];
  return {
    author: rec.author,
    text: rec.value?.text ?? '',
    images: innerImages,
    url: postUrl(rec.uri, rec.author.handle),
  };
}

/** 단일 post 뷰(피드 아이템·스레드 노드 공통)를 BskyPost로 변환 */
function normalizePost(post: RawPost): BskyPost {
  const embed = post.embed;
  const isRecordWithMedia = !!embed?.$type?.includes('recordWithMedia');

  // 미디어: recordWithMedia면 embed.media에, 그 외엔 embed에 직접 붙는다.
  const mediaSource = isRecordWithMedia ? embed?.media : embed;
  const images = mapImages(mediaSource?.images);
  const external = mapExternal(mediaSource?.external);

  // 인용 글: recordWithMedia면 embed.record.record(=viewRecord), record#view면 embed.record가 viewRecord.
  const quoteRecord = isRecordWithMedia ? embed?.record?.record : embed?.record;
  const quote = embed?.$type?.includes('embed.record') ? mapQuote(quoteRecord) : undefined;

  return {
    uri: post.uri,
    cid: post.cid,
    author: post.author,
    text: post.record.text ?? '',
    createdAt: post.record.createdAt ?? post.indexedAt ?? '',
    replyCount: post.replyCount ?? 0,
    repostCount: post.repostCount ?? 0,
    likeCount: post.likeCount ?? 0,
    quoteCount: post.quoteCount ?? 0,
    images,
    external,
    quote,
    url: postUrl(post.uri, post.author.handle),
  };
}

function normalize(item: RawFeedItem): BskyPost {
  const { post, reason } = item;
  const isRepost = !!reason?.$type?.includes('reasonRepost');
  return {
    ...normalizePost(post),
    repostedBy: isRepost ? reason?.by : undefined,
    repostedAt: isRepost ? reason?.indexedAt : undefined,
  };
}

/** handle → did 변환 (List AT-URI를 손으로 만들 때 사용) */
export async function resolveHandle(handle: string): Promise<string> {
  const url = `${APPVIEW}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`resolveHandle ${handle} failed: ${res.status}`);
  const data = (await res.json()) as { did: string };
  return data.did;
}

/**
 * List의 피드를 시간순으로 가져온다.
 * @param listUri at://<did>/app.bsky.graph.list/<rkey>
 */
export async function getListFeed(listUri: string, limit = 30, signal?: AbortSignal): Promise<BskyPost[]> {
  const url = `${APPVIEW}/app.bsky.feed.getListFeed?list=${encodeURIComponent(listUri)}&limit=${limit}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`getListFeed failed: ${res.status}`);
  const data = (await res.json()) as FeedResponse;
  return data.feed.map(normalize);
}

interface RawListItem {
  subject: BskyAuthor;
}

interface ListResponse {
  list: { uri: string; name: string };
  items: RawListItem[];
  cursor?: string;
}

/**
 * List에 속한 멤버(팔로우 대상)들을 가져온다.
 * @param listUri at://<did>/app.bsky.graph.list/<rkey>
 */
export async function getListMembers(listUri: string, limit = 50, signal?: AbortSignal): Promise<BskyAuthor[]> {
  const url = `${APPVIEW}/app.bsky.graph.getList?list=${encodeURIComponent(listUri)}&limit=${limit}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`getList failed: ${res.status}`);
  const data = (await res.json()) as ListResponse;
  return data.items.map((i) => i.subject);
}

/** 스레드 트리의 한 노드: 글 + 그 글에 달린 답글들 */
export interface BskyThreadNode {
  post: BskyPost;
  replies: BskyThreadNode[];
}

/** app.bsky.feed.defs#threadViewPost */
interface RawThreadView {
  $type?: string;
  post?: RawPost;
  replies?: RawThreadView[];
}

function mapThread(node?: RawThreadView): BskyThreadNode | undefined {
  // notFound / blocked 노드는 post가 없으므로 건너뜀
  if (!node?.post) return undefined;
  const replies = (node.replies ?? [])
    .map(mapThread)
    .filter((r): r is BskyThreadNode => r !== undefined)
    // 답글은 오래된 순(작성 시각 오름차순)으로 — 대화 흐름대로
    .sort((a, b) => new Date(a.post.createdAt).getTime() - new Date(b.post.createdAt).getTime());
  return { post: normalizePost(node.post), replies };
}

/**
 * 한 글의 스레드(원본 글 + 답글 트리)를 가져온다.
 * @param uri 글의 at:// URI
 */
export async function getPostThread(uri: string, signal?: AbortSignal): Promise<BskyThreadNode> {
  const url = `${APPVIEW}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=6&parentHeight=0`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`getPostThread failed: ${res.status}`);
  const data = (await res.json()) as { thread: RawThreadView };
  const root = mapThread(data.thread);
  if (!root) throw new Error('thread not found');
  return root;
}

/** 단일 계정 피드 (List 안 쓸 때) */
export async function getAuthorFeed(actor: string, limit = 20, signal?: AbortSignal): Promise<BskyPost[]> {
  const url = `${APPVIEW}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=${limit}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`getAuthorFeed failed: ${res.status}`);
  const data = (await res.json()) as FeedResponse;
  return data.feed.map(normalize);
}
