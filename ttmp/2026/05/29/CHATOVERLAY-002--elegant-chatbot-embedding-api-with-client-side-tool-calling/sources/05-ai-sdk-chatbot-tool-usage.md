---
Title: AI SDK chatbot tool usage
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

With [`useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) and [`streamText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text), you can use tools in your chatbot application. The AI SDK supports three types of tools in this context:

1. Automatically executed server-side tools
2. Automatically executed client-side tools
3. Tools that require user interaction, such as confirmation dialogs

The flow is as follows:

1. The user enters a message in the chat UI.
2. The message is sent to the API route.
3. In your server side route, the language model generates tool calls during the `streamText` call.
4. All tool calls are forwarded to the client.
5. Server-side tools are executed using their `execute` method and their results are forwarded to the client.
6. Client-side tools that should be automatically executed are handled with the `onToolCall` callback. You must call `addToolOutput` to provide the tool result.
7. Client-side tool that require user interactions can be displayed in the UI. The tool calls and results are available as tool invocation parts in the `parts` property of the last assistant message.
8. When the user interaction is done, `addToolOutput` can be used to add the tool result to the chat.
9. The chat can be configured to automatically submit when all tool results are available using `sendAutomaticallyWhen`. This triggers another iteration of this flow.

The tool calls and tool executions are integrated into the assistant message as typed tool parts. A tool part is at first a tool call, and then it becomes a tool result when the tool is executed. The tool result contains all information about the tool call as well as the result of the tool execution.

Tool result submission can be configured using the `sendAutomaticallyWhen` option. You can use the `lastAssistantMessageIsCompleteWithToolCalls` helper to automatically submit when all tool results are available. This simplifies the client-side code while still allowing full control when needed.

## Example

In this example, we'll use three tools:

- `getWeatherInformation`: An automatically executed server-side tool that returns the weather in a given city.
- `askForConfirmation`: A user-interaction client-side tool that asks the user for confirmation.
- `getLocation`: An automatically executed client-side tool that returns a random city.

### API route

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
```

### Client-side page

The client-side page uses the `useChat` hook to create a chatbot application with real-time message streaming. Tool calls are displayed in the chat UI as typed tool parts. Please make sure to render the messages using the `parts` property of the message.

There are three things worth mentioning:

1. The [`onToolCall`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat#on-tool-call) callback is used to handle client-side tools that should be automatically executed. In this example, the `getLocation` tool is a client-side tool that returns a random city. You call `addToolOutput` to provide the result (without `await` to avoid potential deadlocks).
	Always check `if (toolCall.dynamic)` first in your `onToolCall` handler. Without this check, TypeScript will throw an error like: `Type 'string' is   not assignable to type '"toolName1" | "toolName2"'` when you try to use `toolCall.toolName` in `addToolOutput`.
2. The [`sendAutomaticallyWhen`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat#send-automatically-when) option with `lastAssistantMessageIsCompleteWithToolCalls` helper automatically submits when all tool results are available.
3. The `parts` array of assistant messages contains tool parts with typed names like `tool-askForConfirmation`. The client-side tool `askForConfirmation` is displayed in the UI. It asks the user for confirmation and displays the result once the user confirms or denies the execution. The result is added to the chat using `addToolOutput` with the `tool` parameter for type safety.

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
67
68
69
70
71
72
73
74
75
76
77
78
79
80
81
82
83
84
85
86
87
88
89
90
91
92
93
94
95
96
97
98
99
100
101
102
103
104
105
106
107
108
109
110
111
112
113
114
115
116
117
118
119
120
121
122
123
124
125
126
127
128
129
130
131
132
133
134
135
136
137
138
139
140
141
142
143
144
145
146
147
148
149
150
151
152
153
154
155
156
157
158
159
160
161
162
163
164
165
166
167
168
169
170
171
172
173
```

Sometimes an error may occur during client-side tool execution. Use the `addToolOutput` method with a `state` of `output-error` and `errorText` value instead of `output` record the error.

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
```

## Tool Execution Approval

Tool execution approval lets you require user confirmation before a server-side tool runs. Unlike [client-side tools](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage#example) that execute in the browser, tools with approval still execute on the server—but only after the user approves.

Use tool execution approval when you want to:

- Confirm sensitive operations (payments, deletions, external API calls)
- Let users review tool inputs before execution
- Add human oversight to automated workflows

For tools that need to run in the browser (updating UI state, accessing browser APIs), use client-side tools instead.

### Server Setup

Enable approval by setting `needsApproval` on your tool. See [Tool Execution Approval](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#tool-execution-approval) for configuration options including dynamic approval based on input.

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
```

### Client-Side Approval UI

When a tool requires approval, the tool part state is `approval-requested`. Use `addToolApprovalResponse` to approve or deny:

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
```

### Auto-Submit After Approval

If nothing happens after you approve a tool execution, make sure you either call `sendMessage` manually or configure `sendAutomaticallyWhen` on the `useChat` hook.

Use `lastAssistantMessageIsCompleteWithApprovalResponses` to automatically continue the conversation after approvals:

```tsx
1
2
3
4
5
6
```

## Dynamic Tools

When using dynamic tools (tools with unknown types at compile time), the UI parts use a generic `dynamic-tool` type instead of specific tool types:

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
```

Dynamic tools are useful when integrating with:

- MCP (Model Context Protocol) tools without schemas
- User-defined functions loaded at runtime
- External tool providers

## Tool call streaming

Tool call streaming is **enabled by default** in AI SDK 5.0, allowing you to stream tool calls while they are being generated. This provides a better user experience by showing tool inputs as they are generated in real-time.

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
```

With tool call streaming enabled, partial tool calls are streamed as part of the data stream. They are available through the `useChat` hook. The typed tool parts of assistant messages will also contain partial tool calls. You can use the `state` property of the tool part to render the correct UI.

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
```

## Step start parts

When you are using multi-step tool calls, the AI SDK will add step start parts to the assistant messages. If you want to display boundaries between tool calls, you can use the `step-start` parts as follows:

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
```

## Server-side Multi-Step Calls

You can also use multi-step calls on the server-side with `streamText`. This works when all invoked tools have an `execute` function on the server side.

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
```

## Errors

Language models can make errors when calling tools. By default, these errors are masked for security reasons, and show up as "An error occurred" in the UI.

To surface the errors, you can use the `onError` function when calling `toUIMessageResponse`.

```tsx
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
```

```tsx
1
2
3
4
5
6
7
```

In case you are using `createUIMessageResponse`, you can use the `onError` function when calling `toUIMessageResponse`:

```tsx
1
2
3
4
5
6
7
```