---
Title: AI SDK tools and tool calling
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

As covered under Foundations, [tools](https://ai-sdk.dev/docs/foundations/tools) are objects that can be called by the model to perform a specific task. AI SDK Core tools contain several core elements:

- **`description`**: An optional description of the tool that can influence when the tool is picked.
- **`inputSchema`**: A [Zod schema](https://ai-sdk.dev/docs/foundations/tools#schemas) or a [JSON schema](https://ai-sdk.dev/docs/reference/ai-sdk-core/json-schema) that defines the input parameters. The schema is consumed by the LLM, and also used to validate the LLM tool calls.
- **`execute`**: An optional async function that is called with the inputs from the tool call. It produces a value of type `RESULT` (generic type). It is optional because you might want to forward tool calls to the client or to a queue instead of executing them in the same process.
- **`strict`**: *(optional, boolean)* Enables strict tool calling when supported by the provider

You can use the [`tool`](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool) helper function to infer the types of the `execute` parameters.

The `tools` parameter of `generateText` and `streamText` is an object that has the tool names as keys and the tools as values:

```ts
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

When a model uses a tool, it is called a "tool call" and the output of the tool is called a "tool result".

Tool calling is not restricted to only text generation. You can also use it to render user interfaces (Generative UI).

## Strict Mode

When enabled, language model providers that support strict tool calling will only generate tool calls that are valid according to your defined `inputSchema`. This increases the reliability of tool calling. However, not all schemas may be supported in strict mode, and what is supported depends on the specific provider.

By default, strict mode is disabled. You can enable it per-tool by setting `strict: true`:

```ts
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
```

Not all providers or models support strict mode. For those that do not, this option is ignored.

## Input Examples

You can specify example inputs for your tools to help guide the model on how input data should be structured. When supported by providers, input examples can help when JSON schema itself does not fully specify the intended usage or when there are optional values.

```ts
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
```

Only the Anthropic providers supports tool input examples natively. Other providers ignore the setting.

## Tool Execution Approval

By default, tools with an `execute` function run automatically as the model calls them. You can require approval before execution by setting `needsApproval`:

```ts
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
```

This is useful for tools that perform sensitive operations like executing commands, processing payments, modifying data, and more potentially dangerous actions.

### How It Works

When a tool requires approval, `generateText` and `streamText` don't pause execution. Instead, they complete and return `tool-approval-request` parts in the result content. This means the approval flow requires two calls to the model: the first returns the approval request, and the second (after receiving the approval response) either executes the tool or informs the model that approval was denied.

Here's the complete flow:

1. Call `generateText` with a tool that has `needsApproval: true`
2. Model generates a tool call
3. `generateText` returns with `tool-approval-request` parts in `result.content`
4. Your app requests an approval and collects the user's decision
5. Add a `tool-approval-response` to the messages array
6. Call `generateText` again with the updated messages
7. If approved, the tool runs and returns a result. If denied, the model sees the denial and responds accordingly.

### Handling Approval Requests

After calling `generateText` or `streamText`, check `result.content` for `tool-approval-request` parts:

```ts
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
```

To respond, create a `tool-approval-response` and add it to your messages:

```ts
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
```

Then call `generateText` again with the updated messages. If approved, the tool executes. If denied, the model receives the denial and can respond accordingly.

When a tool execution is denied, consider adding a system instruction like "When a tool execution is not approved, do not retry it" to prevent the model from attempting the same call again.

### Dynamic Approval

You can make approval decisions based on tool input by providing an async function:

```ts
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
```

In this example, only transactions over $1000 require approval. Smaller transactions execute automatically.

### Tool Execution Approval with useChat

When using `useChat`, the approval flow is handled through UI state. See [Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage#tool-execution-approval) for details on handling approvals in your UI with `addToolApprovalResponse`.

## Multi-Step Calls (using stopWhen)

With the `stopWhen` setting, you can enable multi-step calls in `generateText` and `streamText`. When `stopWhen` is set and the model generates a tool call, the AI SDK will trigger a new generation passing in the tool result until there are no further tool calls or the stopping condition is met.

The AI SDK provides several built-in stopping conditions:

- `stepCountIs(count)` — stops after a specified number of steps (default: `stepCountIs(20)`)
- `hasToolCall(toolName)` — stops when a specific tool is called
- `isLoopFinished()` — never triggers, letting the loop run until naturally finished

You can also combine multiple conditions in an array or create custom conditions. See [Loop Control](https://ai-sdk.dev/docs/agents/loop-control) for more details.

The `stopWhen` conditions are only evaluated when the last step contains tool results.

By default, when you use `generateText` or `streamText`, it triggers a single generation. This works well for many use cases where you can rely on the model's training data to generate a response. However, when you provide tools, the model now has the choice to either generate a normal text response, or generate a tool call. If the model generates a tool call, its generation is complete and that step is finished.

You may want the model to generate text after the tool has been executed, either to summarize the tool results in the context of the users query. In many cases, you may also want the model to use multiple tools in a single response. This is where multi-step calls come in.

You can think of multi-step calls in a similar way to a conversation with a human. When you ask a question, if the person does not have the requisite knowledge in their common knowledge (a model's training data), the person may need to look up information (use a tool) before they can provide you with an answer. In the same way, the model may need to call a tool to get the information it needs to answer your question where each generation (tool call or text generation) is a step.

### Example

In the following example, there are two steps:

1. **Step 1**
	1. The prompt `'What is the weather in San Francisco?'` is sent to the model.
		2. The model generates a tool call.
		3. The tool call is executed.
2. **Step 2**
	1. The tool result is sent to the model.
		2. The model generates a response considering the tool result.

```ts
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

You can use `streamText` in a similar way.

### Steps

To access intermediate tool calls and results, you can use the `steps` property in the result object or the `streamText` `onFinish` callback. It contains all the text, tool calls, tool results, and more from each step.

#### Example: Extract tool results from all steps

```ts
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
```

### onStepFinish callback

When using `generateText` or `streamText`, you can provide an `onStepFinish` callback that is triggered when a step is finished, i.e. all text deltas, tool calls, and tool results for the step are available. When you have multiple steps, the callback is triggered for each step.

The callback receives a `stepNumber` (zero-based) to identify which step just completed:

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
```

### Tool execution lifecycle callbacks

You can use `experimental_onToolCallStart` and `experimental_onToolCallFinish` to observe tool execution. These callbacks are called right before and after each tool's `execute` function, giving you visibility into tool execution timing, inputs, outputs, and errors:

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
```

Errors thrown inside these callbacks are silently caught and do not break the generation flow.

### prepareStep callback

The `prepareStep` callback is called before a step is started.

It is called with the following parameters:

- `model`: The model that was passed into `generateText`.
- `stopWhen`: The stopping condition that was passed into `generateText`.
- `stepNumber`: The number of the step that is being executed.
- `steps`: The steps that have been executed so far.
- `messages`: The messages that will be sent to the model for the current step.
- `experimental_context`: The context passed via the `experimental_context` setting (experimental).

You can use it to provide different settings for a step, including modifying the input messages.

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
```

#### Message Modification for Longer Agentic Loops

In longer agentic loops, you can use the `messages` parameter to modify the input messages for each step. This is particularly useful for prompt compression:

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
```

#### Provider Options for Step Configuration

You can use `providerOptions` in `prepareStep` to pass provider-specific configuration for each step. This is useful for features like Anthropic's code execution container persistence:

```tsx
1
2
3
4
```

## Response Messages

Adding the generated assistant and tool messages to your conversation history is a common task, especially if you are using multi-step tool calls.

Both `generateText` and `streamText` have a `response.messages` property that you can use to add the assistant and tool messages to your conversation history. It is also available in the `onFinish` callback of `streamText`.

The `response.messages` property contains an array of `ModelMessage` objects that you can add to your conversation history:

```ts
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
```

## Dynamic Tools

AI SDK Core supports dynamic tools for scenarios where tool schemas are not known at compile time. This is useful for:

- MCP (Model Context Protocol) tools without schemas
- User-defined functions at runtime
- Tools loaded from external sources

### Using dynamicTool

The `dynamicTool` helper creates tools with unknown input/output types:

```ts
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

### Type-Safe Handling

When using both static and dynamic tools, use the `dynamic` flag for type narrowing:

```ts
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

## Preliminary Tool Results

You can return an `AsyncIterable` over multiple results. In this case, the last value from the iterable is the final tool result.

This can be used in combination with generator functions to e.g. stream status information during the tool execution:

```ts
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
```

## Tool Choice

You can use the `toolChoice` setting to influence when a tool is selected. It supports the following settings:

- `auto` (default): the model can choose whether and which tools to call.
- `required`: the model must call a tool. It can choose which tool to call.
- `none`: the model must not call tools
- `{ type: 'tool', toolName: string (typed) }`: the model must call the specified tool

```ts
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

## Tool Execution Options

When tools are called, they receive additional options as a second parameter.

### Tool Call ID

The ID of the tool call is forwarded to the tool execution. You can use it e.g. when sending tool-call related information with stream data.

```ts
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
```

### Messages

The messages that were sent to the language model to initiate the response that contained the tool call are forwarded to the tool execution. You can access them in the second parameter of the `execute` function. In multi-step calls, the messages contain the text, tool calls, and tool results from all previous steps.

```ts
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
```

### Abort Signals

The abort signals from `generateText` and `streamText` are forwarded to the tool execution. You can access them in the second parameter of the `execute` function and e.g. abort long-running computations or forward them to fetch calls inside tools.

```ts
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

### Context (experimental)

You can pass in arbitrary context from `generateText` or `streamText` via the `experimental_context` setting. This context is available in the `experimental_context` tool execution option.

```ts
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
```

## Tool Input Lifecycle Hooks

The following tool input lifecycle hooks are available:

- **`onInputStart`**: Called when the model starts generating the input (arguments) for the tool call
- **`onInputDelta`**: Called for each chunk of text as the input is streamed
- **`onInputAvailable`**: Called when the complete input is available and validated

`onInputStart` and `onInputDelta` are only called in streaming contexts (when using `streamText`). They are not called when using `generateText`.

### Example

```ts
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

## Types

Modularizing your code often requires defining types to ensure type safety and reusability. To enable this, the AI SDK provides several helper types for tools, tool calls, and tool results.

You can use them to strongly type your variables, function parameters, and return types in parts of the code that are not directly related to `streamText` or `generateText`.

Each tool call is typed with `ToolCall<NAME extends string, ARGS>`, depending on the tool that has been invoked. Similarly, the tool results are typed with `ToolResult<NAME extends string, ARGS, RESULT>`.

The tools in `streamText` and `generateText` are defined as a `ToolSet`. The type inference helpers `TypedToolCall<TOOLS extends ToolSet>` and `TypedToolResult<TOOLS extends ToolSet>` can be used to extract the tool call and tool result types from the tools.

```ts
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
```

The AI SDK has three tool-call related errors:

- [`NoSuchToolError`](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-no-such-tool-error): the model tries to call a tool that is not defined in the tools object
- [`InvalidToolInputError`](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-invalid-tool-input-error): the model calls a tool with inputs that do not match the tool's input schema
- [`ToolCallRepairError`](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-tool-call-repair-error): an error that occurred during tool call repair

When tool execution fails (errors thrown by your tool's `execute` function), the AI SDK adds them as `tool-error` content parts to enable automated LLM roundtrips in multi-step scenarios.

### generateText

`generateText` throws errors for tool schema validation issues and other errors, and can be handled using a `try` / `catch` block. Tool execution errors appear as `tool-error` parts in the result steps:

```ts
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
```

Tool execution errors are available in the result steps:

```ts
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
```

### streamText

`streamText` sends errors as part of the full stream. Tool execution errors appear as `tool-error` parts, while other errors appear as `error` parts.

When using `toUIMessageStreamResponse`, you can pass an `onError` function to extract the error message from the error part and forward it as part of the stream response:

```ts
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

## Tool Call Repair

The tool call repair feature is experimental and may change in the future.

Language models sometimes fail to generate valid tool calls, especially when the input schema is complex or the model is smaller.

If you use multiple steps, those failed tool calls will be sent back to the LLM in the next step to give it an opportunity to fix it. However, you may want to control how invalid tool calls are repaired without requiring additional steps that pollute the message history.

You can use the `experimental_repairToolCall` function to attempt to repair the tool call with a custom function.

You can use different strategies to repair the tool call:

- Use a model with structured outputs to generate the inputs.
- Send the messages, system prompt, and tool schema to a stronger model to generate the inputs.
- Provide more specific repair instructions based on which tool was called.

### Example: Use a model with structured outputs for repair

```ts
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
```

### Example: Use the re-ask strategy for repair

```ts
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
```

## Active Tools

Language models can only handle a limited number of tools at a time, depending on the model. To allow for static typing using a large number of tools and limiting the available tools to the model at the same time, the AI SDK provides the `activeTools` property.

It is an array of tool names that are currently active. By default, the value is `undefined` and all tools are active.

```ts
1
2
3
4
5
6
7
8
```

Multi-modal tool results are experimental and supported by Anthropic, OpenAI, and Google (Gemini 3 models).

For Google, use base64 media parts (`image-data` / `file-data`) or base64 `data:` URLs in URL-style parts. Remote HTTP(S) URLs in tool-result URL parts are not supported.

In order to send multi-modal tool results, e.g. screenshots, back to the model, they need to be converted into a specific format.

AI SDK Core tools have an optional `toModelOutput` function that converts the tool result into a content part.

Here is an example for converting a screenshot into a content part:

```ts
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
```

## Extracting Tools

Once you start having many tools, you might want to extract them into separate files. The `tool` helper function is crucial for this, because it ensures correct type inference.

Here is an example of an extracted tool:

```ts
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
```

## MCP Tools

The AI SDK supports connecting to Model Context Protocol (MCP) servers to access their tools. MCP enables your AI applications to discover and use tools across various services through a standardized interface.

For detailed information about MCP tools, including initialization, transport options, and usage patterns, see the [MCP Tools documentation](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools).

### AI SDK Tools vs MCP Tools

In most cases, you should define your own AI SDK tools for production applications. They provide full control, type safety, and optimal performance. MCP tools are best suited for rapid development iteration and scenarios where users bring their own tools.

| Aspect | AI SDK Tools | MCP Tools |
| --- | --- | --- |
| **Type Safety** | Full static typing end-to-end | Dynamic discovery at runtime |
| **Execution** | Same process as your request (low latency) | Separate server (network overhead) |
| **Prompt Control** | Full control over descriptions and schemas | Controlled by MCP server owner |
| **Schema Control** | You define and optimize for your model | Controlled by MCP server owner |
| **Version Management** | Full visibility over updates | Can update independently (version skew risk) |
| **Authentication** | Same process, no additional auth required | Separate server introduces additional auth complexity |
| **Best For** | Production applications requiring control and performance | Development iteration, user-provided tools |

## Examples

You can see tools in action using various frameworks in the following examples: