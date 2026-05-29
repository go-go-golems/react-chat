---
Title: AI SDK stream UI
Ticket: CHATOVERLAY-002
Status: reference
Topics:
    - chat-overlay
    - research
DocType: reference
Intent: reference
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Downloaded external research source for CHATOVERLAY-002.
---

AI SDK RSC is currently experimental. We recommend using [AI SDK UI](https://ai-sdk.dev/docs/ai-sdk-ui/overview) for production. For guidance on migrating from RSC to UI, see our [migration guide](https://ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui).

A helper function to create a streamable UI from LLM providers. This function is similar to AI SDK Core APIs and supports the same model interfaces.

To see `streamUI` in action, check out [these examples](https://ai-sdk.dev/docs/reference/ai-sdk-rsc/stream-ui#examples).

## Import

```
import { streamUI } from "@ai-sdk/rsc"
```

## Parameters

### model:

LanguageModel

### initial?:

ReactNode

### system:

string | SystemModelMessage | SystemModelMessage\[\]

### prompt:

string

### messages:

Array<SystemModelMessage | UserModelMessage | AssistantModelMessage | ToolModelMessage> | Array<UIMessage>

SystemModelMessage

### role:

'system'

### content:

string

UserModelMessage

### role:

'user'

### content:

string | Array<TextPart | ImagePart | FilePart>

TextPart

### type:

'text'

### text:

string

ImagePart

### type:

'image'

### image:

string | Uint8Array | Buffer | ArrayBuffer | URL

### mediaType?:

string

FilePart

### type:

'file'

### data:

string | Uint8Array | Buffer | ArrayBuffer | URL

### mediaType:

string

AssistantModelMessage

### role:

'assistant'

### content:

string | Array<TextPart | ToolCallPart>

TextPart

### type:

'text'

### text:

string

ToolCallPart

### type:

'tool-call'

### toolCallId:

string

### toolName:

string

### args:

object based on zod schema

ToolModelMessage

### role:

'tool'

### content:

Array<ToolResultPart>

ToolResultPart

### type:

'tool-result'

### toolCallId:

string

### toolName:

string

### result:

unknown

### allowSystemInMessages?:

boolean

### maxOutputTokens?:

number

### temperature?:

number

### topP?:

number

### topK?:

number

### presencePenalty?:

number

### frequencyPenalty?:

number

### stopSequences?:

string\[\]

### seed?:

number

### maxRetries?:

number

### abortSignal?:

AbortSignal

### headers?:

Record<string, string>

### tools:

ToolSet

Tool

### description?:

string

### inputSchema:

zod schema

### generate?:

(async (parameters) => ReactNode) | AsyncGenerator<ReactNode, ReactNode, void>

### toolChoice?:

"auto" | "none" | "required" | { "type": "tool", "toolName": string }

### text?:

(Text) => ReactNode

Text

### content:

string

### delta:

string

### done:

boolean

### providerOptions?:

Record<string,JSONObject> | undefined

### onFinish?:

(result: OnFinishResult) => void

OnFinishResult

### usage:

LanguageModelUsage

LanguageModelUsage

### inputTokens:

number | undefined

### inputTokenDetails:

LanguageModelInputTokenDetails

LanguageModelInputTokenDetails

### noCacheTokens:

number | undefined

### cacheWriteTokens:

number | undefined

### outputTokens:

number | undefined

### outputTokenDetails:

LanguageModelOutputTokenDetails

LanguageModelOutputTokenDetails

### textTokens:

number | undefined

### reasoningTokens:

number | undefined

### totalTokens:

number | undefined

### raw?:

object | undefined

### value:

ReactNode

### warnings:

Warning\[\] | undefined

### response:

Response

Response

### headers?:

Record<string, string>

## Returns

### value:

ReactNode

### response?:

Response

Response

### headers?:

Record<string, string>

### warnings:

Warning\[\] | undefined

### stream:

AsyncIterable<StreamPart> & ReadableStream<StreamPart>

StreamPart

### type:

'text-delta'

### textDelta:

string

StreamPart

### type:

'tool-call'

### toolCallId:

string

### toolName:

string

### args:

object based on zod schema

StreamPart

### type:

'error'

### error:

Error

StreamPart

### type:

'finish'

### finishReason:

'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other'

### usage:

LanguageModelUsage

LanguageModelUsage

### inputTokens:

number | undefined

### inputTokenDetails:

LanguageModelInputTokenDetails

LanguageModelInputTokenDetails

### noCacheTokens:

number | undefined

### cacheWriteTokens:

number | undefined

### outputTokens:

number | undefined

### outputTokenDetails:

LanguageModelOutputTokenDetails

LanguageModelOutputTokenDetails

### textTokens:

number | undefined

### reasoningTokens:

number | undefined

### totalTokens:

number | undefined

### raw?:

object | undefined

## Examples[Learn to render a React component as a function call using a language model in Next.js](https://ai-sdk.dev/examples/next-app/state-management/ai-ui-states)

[

Learn to persist and restore states UI/AI states in Next.js

](https://ai-sdk.dev/examples/next-app/state-management/save-and-restore-states)[

Learn to route React components using a language model in Next.js

](https://ai-sdk.dev/examples/next-app/interface/route-components)[

Learn to stream component updates to the client in Next.js

](https://ai-sdk.dev/examples/next-app/interface/stream-component-updates)