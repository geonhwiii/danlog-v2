---
title: 'Agent Slack Bot 만들기 (feat. Chat SDK)'
description: 'Chat SDK의 사용법과 이를 활용하여 Agent Slack Bot을 만들어봅니다'
date: '08 16 2026'
tags:
  - AI
---

Vercel에서 만든 `Chat SDK`를 간단하게 알아보고, 이를 활용해서 슬랙봇을 만들어보겠습니다. 이후 설명에 나오겠지만 어댑터 구조를 통해 디스코드나 팀즈에도 간단하게 적용할 수 있습니다.

<br />

---

## Chat SDK

Vercel이 만든 **TypeScript 챗봇 프레임워크**로 Slack, Teams, Discord, Google Chat, Telegram, WhatsApp, GitHub, Linear 같은 플랫폼을 어댑터에 넣기만 하면 됩니다.

가장 간단한 챗봇의 구현은 아래와 같습니다. `adapters`로 각 플랫폼을 넣게 만든 추상화는 정말 잘 만든 것 같습니다.

```typescript
import { Chat } from 'chat';
import { createSlackAdapter } from '@chat-adapter/slack';
import { createRedisState } from '@chat-adapter/state-redis';

const bot = new Chat({
  userName: 'mybot',
  adapters: { slack: createSlackAdapter() },
  state: createRedisState(),
});

bot.onNewMention(async (thread) => {
  await thread.post('안녕하세요!');
});
```

## 시작하기

[CLI](https://chat-sdk.dev/docs/create-chat-sdk)를 통해 간단하게 시작할 수 있습니다.

```bash
# 기본
npm create chat-sdk@latest my-bot

# slack, redis 설정 포함
npm create chat-sdk@latest -- my-bot --adapter slack redis -y
```

### Chat 인스턴스 만들기

먼저 `Chat` 인스턴스로 봇을 생성합니다.

```typescript
const bot = new Chat({
  userName: 'mybot',
  adapters: { slack: createSlackAdapter() },
  state: createRedisState(),
});
```

`userName`은 봇의 **핸들**입니다. SDK가 메시지 텍스트에서 `@이름`을 찾을 때 사용하므로, 그에 맞게 설정하면 됩니다.

`adapter`는 환경변수(`SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` 등)를 내부에서 선언해서 사용하므로, 사용하는 플랫폼에 따라 별도의 환경변수 설정이 필요합니다.

이 밖에 주로 사용하는 옵션은 아래와 같습니다.

| 옵션                        | 설명                                                 |
| --------------------------- | ---------------------------------------------------- |
| `dedupeTtlMs`               | 메시지 중복 제거 유지 시간 (기본 10분)               |
| `concurrency`               | 처리 중에 메시지가 또 오면 어떻게 할지 (기본 `drop`) |
| `onLockConflict`            | 락이 잡혀 있을 때의 동작. 긴 작업에는 `force`        |
| `streamingUpdateIntervalMs` | 스트리밍 갱신 간격 (기본 500ms)                      |

### 핸들러 등록하기

이벤트가 오면 SDK가 정해진 순서로 핸들러를 고릅니다.

1. **DM** — `onDirectMessage`가 등록되어 있으면 가장 먼저 불립니다.
2. **구독한 스레드** — 구독 중이면 `onSubscribedMessage`가 불리고, 다른 메시지 핸들러는 불리지 않습니다.
3. **멘션** — 구독하지 않은 스레드에서 봇이 **@멘션**되면 `onNewMention`이 불립니다.
4. **패턴** — `onNewMessage`에 등록한 정규식과 맞으면 불립니다.

`thread.subscribe()`로 한 번 구독하면 그 스레드의 모든 후속 메시지가 `onSubscribedMessage`로 전달됩니다.

```typescript
bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await thread.post('스레드를 구독하고 있습니다.');
});

bot.onSubscribedMessage(async (thread, message) => {
  await thread.post(`구독 답변: ${message.text}`);
});
```

### 답장 보내기

`thread.post()`로 답을 보낼 수 있습니다. Agent Bot을 만든다면, Bot의 답변을 `post`로 전달할 수 있습니다.

스레드 전체를 읽어야 한다면 `thread.allMessages`를 씁니다.

```ts
for await (const message of thread.allMessages) {
  console.log(message.author.fullName, message.text);
}
```

작업이 길어질 때는 `thread.startTyping()`으로 상태를 보여주고, AI 응답이라면 스트림을 그대로 넘길 수 있습니다.

```ts
const result = await agent.stream({ prompt: message.text });
await thread.post(result.fullStream);
```

> `textStream`이 아니라 `fullStream`을 권장합니다. 에이전트가 텍스트 중간에 도구를 호출하면 `textStream`은 구분 없이 이어 붙여서 `"안녕하세요.무엇을 도와드릴까요?"`처럼 나오고, `fullStream`에는 SDK가 문단을 나눠줍니다.

### 웹훅 연결하기

마지막으로 아래와 같이 API 라우트에 연결합니다. `bot.webhooks`로 어댑터별로 `POST`를 연결해줍니다.

```ts title="app/api/webhooks/slack/route.ts"
import { bot } from '@/lib/bot';

export const POST = bot.webhooks.slack;
```

여기까지가 Chat SDK 사용법의 간단한 설명이었습니다.

<br />

---

## Agent Chat Bot

업무에서 시간이 많이 드는 일 중 하나는 히스토리 파악입니다.

이슈가 생기면 비슷한 사례를 찾아 해결 방법을 확인하고, 고객 문의가 오면 이전 대응을 참고합니다.

문제는 검색 자체에도 시간이 들고, 구두로만 해결하고 기록이 남지 않거나 노션·별도 문서로 흩어져 있어 찾기 어렵다는 점입니다.

```bash title="봇 대화 예시"
@봇 이 스레드 요약해줘
@봇 이 이슈 전에도 있었어?
@봇 이 스레드 지식 저장해줘
@봇 이거 기술검토해줘
```

번거로운 기록 과정은 줄이고, 봇을 이용해 사실만을 기록하고 다시 검색할 수 있도록 합니다.

대부분의 코드는 AI로 작성되었고, 작성된 코드를 이해하는 과정을 같이 진행해보겠습니다.

<br />

---

### 1. 진입점: 슬랙 웹훅 수신과 비동기 응답

```tsx title="app/api/webhooks/[platform]/route.ts"
interface Context {
  params: Promise<{ platform: string }>;
}

async function handleRequest(request: Request, context: Context) {
  const { platform } = await context.params;

  const bot = getBot();
  const handler = bot.webhooks[platform as keyof typeof bot.webhooks];

  if (!handler) {
    return new Response(`Unknown platform: ${platform}`, { status: 404 });
  }

  return handler(request, {
    waitUntil: (task) => after(() => task),
  });
}

export const GET = handleRequest;
export const POST = handleRequest;
```

- **역할** : 슬랙 서버에서 보내는 HTTP POST 웹훅 요청을 가장 먼저 받는 Next.js의 `Route Handler`입니다.
- **핵심 포인트** :
  - 슬랙은 3초 이내에 `200 OK` 응답을 받지 못하면 타임아웃으로 간주하고 재전송합니다.
  - 하지만 LLM 추출·검색·판정은 10~20초 이상 걸릴 수 있습니다.
  - 이를 해결하기 위해 `waitUntil: (task) => after(() => task)`를 사용하여 슬랙에는 즉시 응답을 반환하고, 실제 에이전트 처리는 백그라운드 태스크로 넘깁니다.

### 2. 챗봇 인프라와 이벤트 핸들러

```tsx title="lib/bot.ts"
let instance: Chat | undefined;

export function getBot(): Chat {
  if (!instance) {
    instance = new Chat({
      userName: process.env.BOT_USERNAME ?? 'slack-bot',
      adapters: {
        slack: createSlackAdapter(),
      },
      state: createPostgresState(),
    });

    registerHandlers(instance);
  }

  return instance;
}
```

Vercel의 `Chat SDK`를 사용해 **슬랙 어댑터**(`createSlackAdapter`)와 **Postgres 상태 관리**(`createPostgresState`)를 연결합니다.

`registerHandlers` 함수에 인스턴스를 전달하여 채팅 기능을 구현합니다.

```tsx title="lib/bot.ts"
function registerHandlers(chat: Chat) {
  // 채널에서는 멘션을 부를때만 응답을 전달합니다.
  chat.onNewMention(respond);

  // DM에서 활성화를 원한다면, 추가로 연결해줍니다.
  chat.onDirectMessage(respond);
}
```

채널에서는 봇이 멘션받을 때만 응답하도록 설정합니다. 비용이 넉넉하다면 `chat.onSubscribedMessage`로 구독형으로 사용할 수도 있습니다.

봇과 DM을 통해 대화를 할 경우, `chat.onDirectMessage`에 응답을 전달하면 됩니다.

이제 `respond`함수를 알아보겠습니다.

```tsx title="lib/bot.ts"
/**
 * 스레드 내용과 메세지를 사용해 agent를 실행하고, 슬랙에 응답을 전달합니다.
 */
async function respond(thread: Thread, message: Message) {
  const requestedBy = message.author.fullName || message.author.userName;

  try {
    // 응답 중에 로딩 상태를 표시합니다.
    await thread.startTyping('스레드를 읽는 중...');

    // 아래 4번에서 다룰 bot의 핵심 Agent 도구 함수입니다.
    const agent = createKnowledgeAgent({ thread, requestedBy });
    // 멘션 내용을 제외하고 prompt로 전달합니다.
    const result = await agent.stream({ prompt: stripMentionIds(message.text) });

    await thread.post(result.fullStream);
  } catch (error) {
    console.error('[respond] 처리 실패', { threadId: thread.id, error });
    await thread.post('잠시 후 다시 시도해 주세요.');
  }
}
```

주석에 설명된 것처럼, AI 채팅의 응답 흐름과 비슷합니다. 로딩 상태를 보여주고, `prompt`를 전달하고, LLM 응답을 `stream`으로 보여줍니다.

대부분의 구현을 `Chat SDK`가 해주다보니, 코드가 아주 간단한 걸 볼 수 있습니다 :)

### 3. 슬랙 의존성 격리와 메시지 정규화

```tsx title="lib/slack-thread.ts"
export async function toSourceThread(thread: Thread, options: ToSourceThreadOptions = {}): Promise<SourceThread> {
  const messages: SourceMessage[] = [];

  // 스레드의 메세지 내용을 추출합니다.
  for await (const message of thread.allMessages) {
    // 봇 메세지와 시스템 메세지는 건너뜁니다.
    if (message.author.isMe || message.author.isSystem) continue;

    // 멘션 내용은 제거합니다.
    const text = stripMentionIds(message.text);
    if (!text) continue;

    messages.push({
      authorName: message.author.fullName || message.author.userName,
      text,
      postedAt: message.metadata.dateSent,
    });
  }

  let channelName: string | undefined;
  let permalink: string | undefined;

  // 저장 요청의 경우 슬랙에서 채널 이름과 원본 링크를 가져옵니다.
  if (options.forStorage) {
    try {
      await thread.channel.fetchMetadata();
      channelName = thread.channel.name ?? undefined;
    } catch {}
    // slack api를 사용해 원문 링크를 전달합니다.
    permalink = await resolvePermalink(thread.id);
  }

  return {
    key: thread.id,
    channelId: thread.channelId,
    channelName,
    permalink,
    messages,
  };
}
```

- **역할** : 슬랙의 복잡한 **메시지 객체**(`Thread`)를 도메인에서 다루기 편한 **순수 데이터**(`SourceThread`)로 변환합니다.
- **핵심 포인트** :
  - **봇/시스템 메시지 필터링**: 봇 자신의 응답이나 시스템 알림을 제외하고 사람들의 발언만 추출합니다.
  - **외부 API 호출**: 슬랙 API를 호출해서 채널 이름과 원본 링크를 가져옵니다.

### 4. 도메인 모델과 데이터 추출

```tsx title="lib/agent.ts"
export function createKnowledgeAgent({ thread, requestedBy }: AgentContext) {
  return new ToolLoopAgent({
    model: reasoningModel,
    instructions: INSTRUCTIONS,
    providerOptions: { anthropic: { effort: 'high' } },
    tools: {
      // 도구 1 : 스레드를 읽을 때
      read_thread: tool({
        description:
          '지금 스레드의 대화 원문을 읽는다. 요약이나 기술검토처럼 스레드 내용 자체가 ' +
          '필요한 요청에서 먼저 부른다.',
        inputSchema: z.object({}),
        execute: async () => {
          const source = await toSourceThread(thread);
          return {
            messageCount: source.messages.length,
            transcript: renderTranscript(source),
          };
        },
      }),
      // 도구 2 : 유사 스레드 찾을 때
      find_related_knowledge: tool({
        description:
          '지금 스레드의 논의와 같은 상황을 다룬 과거 기록이 지식베이스에 있는지 찾는다. ' +
          "'이거 전에 있었던 이슈야?', '전에 이런 적 있었나?' 같은 질문에 쓴다.",
        inputSchema: z.object({}),
        execute: async () => {
          const source = await toSourceThread(thread);
          const result = await findRelatedKnowledge(source);

          return {
            searchedFor: result.situation,
            verdict: result.related.length > 0 ? 'related_found' : 'no_related_record',
            related: result.related.map((match) => ({
              ...describeEntry(match.entry),
              why: match.why,
            })),
            adjacent: result.adjacent.map(describeEntry),
          };
        },
      }),
      // 도구 3 : 스레드를 저장할 때
      save_knowledge: tool({
        description:
          '지금 스레드를 지식베이스에 저장한다. 이미 저장된 스레드면 새로 만들지 않고 ' +
          "스레드를 다시 읽어 기존 기록을 갱신한다. '이 스레드 저장해줘', '지식으로 남겨줘'에 쓴다.",
        inputSchema: z.object({}),
        execute: async () => {
          // DM에 저장하면 출처 채널이 그 DM이라 아무도 찾을 수 없다. 저장했다고
          // 답해놓고 아무도 못 찾는 상태가 제일 나쁘므로 여기서 막는다.
          if (thread.isDM) {
            return {
              saved: false,
              reason: 'DM에서는 저장하지 않습니다. 채널에서 저장해야 다른 사람이 찾을 수 있습니다.',
            };
          }

          const source = await toSourceThread(thread, { forStorage: true });
          const { entry, created } = await saveThreadAsKnowledge(source, requestedBy);

          return {
            saved: true,
            created,
            visibility: '워크스페이스 전원이 검색할 수 있습니다.',
            entry: describeEntry(entry),
          };
        },
      }),
      // 도구 4 : 스레드를 삭제할 때
      delete_knowledge: tool({
        description: '지금 스레드의 기록을 지식베이스에서 지운다. 공개돼선 안 될 내용이 저장됐을 때 쓴다.',
        inputSchema: z.object({}),
        execute: async () => {
          const deleted = await forgetThread(thread.id);
          return deleted
            ? { deleted: true, entry: describeEntry(deleted) }
            : { deleted: false, reason: '이 스레드는 지식베이스에 저장된 적이 없습니다.' };
        },
      }),
    },
  });
}
```

- **역할** : 사용자의 자연어 요청을 해석하고 적절한 Tool을 실행하는 **AI Agent**입니다.
- **핵심 포인트** :
  - **Tool 기반 아키텍처** : Tool 방식으로 설계되어, "검색해보고 없으면 저장해줘" 같은 복합 요청도 자율적으로 처리합니다.
  - **4가지 핵심 Tool** :
    1. **read_thread** : 스레드 원문을 읽고 요약/기술검토를 수행.
    2. **find_related_knowledge** : 과거 동일/유사 이슈가 있는지 탐색.
    3. **save_knowledge** : 스레드 내용을 지식베이스에 저장/갱신 (DM에서는 저장 금지).
    4. **delete_knowledge** : 잘못 공개된 지식을 삭제.
- **프롬프트 원칙** :
  - 친근하되 사실에 엄격한 태도 ("비슷한 게 있을 수도 있습니다" 식의 모호한 얼버무림 금지).
  - 기술검토 시에는 봇이 함부로 합격/불합격을 판정하지 않고, 놓치기 쉬운 **'좋은 질문'과 '위험 요소'**를 던지도록 유도.

### 5. 모델과 DB 설정

#### 1. 모델

- **추론 모델** : `claude-opus-5`
- **임베딩 모델** : OpenAI `text-embedding-3-large`

> 비용을 한 곳으로 모으려면 추론 모델을 OpenAI로 통일하는 것도 좋습니다.

#### 2. DB 설정

```tsx title="lib/db.ts"
let pool: Pool | undefined;

export function db(): Pool {
  // pool이 없을 때만, 생성합니다.
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('POSTGRES_URL (또는 DATABASE_URL) 환경변수가 없습니다.');
    }
    // 서버리스 환경이므로, 최대 3개의 연결을 설정합니다.
    pool = new Pool({ connectionString, max: 3 });
  }
  return pool;
}
```

> 💡 **Postgres Connection Pooling이란?**
>
> 데이터베이스에 접속할 때마다 연결을 새로 맺는 것은 비용이 많이 드는 작업입니다. `Connection Pooling`은 미리 일정 수의 연결(`Connection`)을 만들어두고, 필요할 때마다 빌려 쓰고 반납하는 방식으로 동작합니다. 이를 통해 DB 서버의 부하를 줄이고 응답 속도를 높일 수 있습니다.

### 6. extract

```tsx title="lib/extract.ts"
export interface ExtractOptions {
  model?: LanguageModel;
}

export async function extractDraft(thread: SourceThread, options: ExtractOptions = {}): Promise<EntryDraft> {
  if (thread.messages.length === 0) {
    throw new Error(`빈 스레드에서는 지식을 뽑을 수 없습니다: ${thread.key}`);
  }

  const { object, usage } = await generateObject({
    model: options.model ?? reasoningModel,
    schema: draftSchema,
    schemaName: 'knowledge_entry',
    system: SYSTEM_PROMPT,
    prompt: renderTranscript(thread),
    maxOutputTokens: 4000,
    providerOptions: {
      anthropic: { effort: 'high' },
    },
  });

  return object;
}
```

- **역할** : 슬랙 스레드의 대화 원문을 분석하여, 검색 및 저장에 최적화된 **지식 레코드**로 추출합니다.
- **핵심 포인트** :
  - **구조화된 출력** : 단순한 텍스트 요약이 아니라 `zod schema`를 활용하여 필드가 명확히 분리된 **JSON 객체**로 추출합니다.

---

## 실제 동작

작성중

---

## 🔗 참고 링크

1. [**Chat SDK 공식 문서**](https://chat-sdk.dev/docs/create-chat-sdk)

2. [**The Complete Guide to Chat SDK**](https://vercel.com/kb/guide/the-complete-guide-to-chat-sdk)

3. [**slack-knowledge-bot 저장소**](https://github.com/geonhwiii/slack-knowledge-bot)
