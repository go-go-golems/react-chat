package mockengine

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	widgetv1 "github.com/go-go-golems/chat-overlay/internal/pb/proto/chatoverlay/widgets/v1"
	"github.com/go-go-golems/chat-overlay/internal/widgets"
	chatapp "github.com/go-go-golems/pinocchio/pkg/chatapp"
	chatappv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/v1"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"
)

const (
	CommandStart = "ChatOverlayStartInference"
	CommandStop  = "ChatOverlayStopInference"
)

type Option func(*Engine)

type Engine struct {
	mu         sync.Mutex
	nextID     int
	active     map[sessionstream.SessionId]*run
	responses  []Response
	chunkDelay time.Duration
}

type run struct {
	messageID string
	cancel    context.CancelFunc
	done      chan struct{}
}

func WithChunkDelay(delay time.Duration) Option {
	return func(e *Engine) {
		if delay > 0 {
			e.chunkDelay = delay
		}
	}
}

func WithResponses(responses []Response) Option {
	return func(e *Engine) {
		if len(responses) > 0 {
			e.responses = responses
		}
	}
}

func New(opts ...Option) *Engine {
	e := &Engine{
		active:     map[sessionstream.SessionId]*run{},
		responses:  defaultResponses(),
		chunkDelay: 20 * time.Millisecond,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(e)
		}
	}
	return e
}

func RegisterSchemas(reg *sessionstream.SchemaRegistry) error {
	for _, err := range []error{
		reg.RegisterCommand(CommandStart, &chatappv1.StartInferenceCommand{}),
		reg.RegisterCommand(CommandStop, &chatappv1.StopInferenceCommand{}),
	} {
		if err != nil {
			return err
		}
	}
	return nil
}

func (e *Engine) Install(hub *sessionstream.Hub) error {
	if hub == nil {
		return fmt.Errorf("hub is nil")
	}
	if err := hub.RegisterCommand(CommandStart, e.HandleStart); err != nil {
		return err
	}
	if err := hub.RegisterCommand(CommandStop, e.HandleStop); err != nil {
		return err
	}
	return nil
}

func (e *Engine) HandleStart(ctx context.Context, cmd sessionstream.Command, _ *sessionstream.Session, pub sessionstream.EventPublisher) error {
	payload, ok := cmd.Payload.(*chatappv1.StartInferenceCommand)
	if !ok || payload == nil {
		return fmt.Errorf("start inference payload must be %T, got %T", &chatappv1.StartInferenceCommand{}, cmd.Payload)
	}
	prompt := strings.TrimSpace(payload.GetPrompt())
	if prompt == "" {
		return fmt.Errorf("prompt is empty")
	}

	messageID := e.nextMessageID()
	userMessageID := messageID + "-user"
	if err := pub.Publish(ctx, sessionstream.Event{
		Name:      chatapp.EventUserMessageAccepted,
		SessionId: cmd.SessionId,
		Payload: &chatappv1.ChatUserMessageAccepted{
			MessageId: userMessageID,
			Role:      "user",
			Text:      prompt,
			Content:   prompt,
			Status:    "accepted",
		},
	}); err != nil {
		return err
	}

	runCtx, cancel := context.WithCancel(context.WithoutCancel(ctx))
	r := &run{messageID: messageID, cancel: cancel, done: make(chan struct{})}
	if previous := e.swapRun(cmd.SessionId, r); previous != nil {
		previous.cancel()
		<-previous.done
	}
	go e.run(runCtx, cmd.SessionId, messageID, prompt, pub, r.done)
	return nil
}

func (e *Engine) HandleStop(_ context.Context, cmd sessionstream.Command, _ *sessionstream.Session, _ sessionstream.EventPublisher) error {
	if current := e.currentRun(cmd.SessionId); current != nil {
		current.cancel()
	}
	return nil
}

func (e *Engine) WaitIdle(ctx context.Context, sid sessionstream.SessionId) error {
	for {
		current := e.currentRun(sid)
		if current == nil {
			return nil
		}
		select {
		case <-current.done:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

func (e *Engine) run(ctx context.Context, sid sessionstream.SessionId, messageID, prompt string, pub sessionstream.EventPublisher, done chan struct{}) {
	defer close(done)
	defer e.clearRun(sid, messageID)
	publishCtx := context.WithoutCancel(ctx)
	resp := e.matchResponse(prompt)

	if resp.Error != "" {
		e.publishRunFailed(publishCtx, sid, pub, messageID, resp.Error)
		return
	}

	if err := publish(publishCtx, sid, pub, chatapp.EventChatRunStarted, &chatappv1.ChatRunStarted{MessageId: messageID, Prompt: prompt}); err != nil {
		e.logPublishError(err, sid, messageID, chatapp.EventChatRunStarted, prompt)
		return
	}

	textSegmentID := messageID + ":text:1"
	if err := publish(publishCtx, sid, pub, chatapp.EventChatTextSegmentStarted, &chatappv1.ChatTextSegmentStarted{MessageId: textSegmentID, Role: "assistant", Prompt: prompt, Status: "streaming", Streaming: true}); err != nil {
		e.logPublishError(err, sid, messageID, chatapp.EventChatTextSegmentStarted, prompt)
		return
	}

	accumulated := ""
	chunks := chunkText(resp.Text, 10)
	if resp.Long {
		chunks = chunkText(resp.Text+" "+strings.Repeat("more text ", 80), 10)
	}
	for i, chunk := range chunks {
		select {
		case <-ctx.Done():
			e.publishStopped(publishCtx, sid, pub, messageID, textSegmentID, prompt, accumulated)
			return
		case <-time.After(e.chunkDelay):
		}
		accumulated += chunk
		if err := publish(publishCtx, sid, pub, chatapp.EventChatTextPatch, &chatappv1.ChatTextPatch{MessageId: textSegmentID, Role: "assistant", Prompt: prompt, StreamId: textSegmentID, Sequence: uint64(i + 1), Text: chunk, Mode: chatappv1.ChatStreamPatchMode_CHAT_STREAM_PATCH_MODE_APPEND, Status: "streaming"}); err != nil {
			e.logPublishError(err, sid, messageID, chatapp.EventChatTextPatch, prompt)
			return
		}
	}

	if err := publish(publishCtx, sid, pub, chatapp.EventChatTextSegmentFinished, &chatappv1.ChatTextSegmentFinished{MessageId: textSegmentID, Role: "assistant", Prompt: prompt, Text: accumulated, Content: accumulated, Status: "finished", Streaming: false, Final: true}); err != nil {
		e.logPublishError(err, sid, messageID, chatapp.EventChatTextSegmentFinished, prompt)
		return
	}

	for _, w := range resp.Widgets {
		if err := e.publishWidget(ctx, publishCtx, sid, messageID, w, pub); err != nil {
			e.logPublishError(err, sid, messageID, "widget", prompt)
			return
		}
	}

	if err := publish(publishCtx, sid, pub, chatapp.EventChatRunFinished, &chatappv1.ChatRunFinished{MessageId: messageID, Status: "finished"}); err != nil {
		e.logPublishError(err, sid, messageID, chatapp.EventChatRunFinished, prompt)
	}
}

func (e *Engine) publishWidget(runCtx, publishCtx context.Context, sid sessionstream.SessionId, parentMessageID string, w WidgetSpec, pub sessionstream.EventPublisher) error {
	instanceID := "widget-" + uuid.NewString()[:8]
	props, err := structpb.NewStruct(w.Props)
	if err != nil {
		return err
	}
	if w.StreamParts <= 0 {
		return publish(publishCtx, sid, pub, widgets.EventWidgetInstanceStarted, &widgetv1.WidgetInstanceStarted{InstanceId: instanceID, WidgetName: w.Name, ParentMessageId: parentMessageID, Status: widgetv1.WidgetStatus_WIDGET_STATUS_READY, Props: props})
	}

	partial := map[string]any{}
	for k, v := range w.Props {
		if _, ok := v.([]any); ok {
			partial[k] = []any{}
		} else {
			partial[k] = v
		}
	}
	partialProps, err := structpb.NewStruct(partial)
	if err != nil {
		return err
	}
	if err := publish(publishCtx, sid, pub, widgets.EventWidgetInstanceStarted, &widgetv1.WidgetInstanceStarted{InstanceId: instanceID, WidgetName: w.Name, ParentMessageId: parentMessageID, Status: widgetv1.WidgetStatus_WIDGET_STATUS_STREAMING, Props: partialProps}); err != nil {
		return err
	}

	for key, value := range w.Props {
		items, ok := value.([]any)
		if !ok {
			continue
		}
		accumulated := make([]any, 0, len(items))
		for _, item := range items {
			select {
			case <-runCtx.Done():
				return runCtx.Err()
			case <-time.After(e.chunkDelay * 3):
			}
			accumulated = append(accumulated, item)
			patch, err := structpb.NewStruct(map[string]any{key: accumulated})
			if err != nil {
				return err
			}
			if err := publish(publishCtx, sid, pub, widgets.EventWidgetInstancePatched, &widgetv1.WidgetInstancePatched{InstanceId: instanceID, WidgetName: w.Name, Status: widgetv1.WidgetStatus_WIDGET_STATUS_STREAMING, Patch: patch}); err != nil {
				return err
			}
		}
	}
	return publish(publishCtx, sid, pub, widgets.EventWidgetInstanceCompleted, &widgetv1.WidgetInstanceCompleted{InstanceId: instanceID, Status: widgetv1.WidgetStatus_WIDGET_STATUS_READY})
}

func (e *Engine) publishStopped(ctx context.Context, sid sessionstream.SessionId, pub sessionstream.EventPublisher, messageID, textSegmentID, prompt, accumulated string) {
	_ = publish(ctx, sid, pub, chatapp.EventChatTextSegmentFinished, &chatappv1.ChatTextSegmentFinished{MessageId: textSegmentID, Role: "assistant", Prompt: prompt, Text: accumulated, Content: accumulated, Status: "stopped", Streaming: false, Final: true, FinishReason: "stopped"})
	_ = publish(ctx, sid, pub, chatapp.EventChatRunStopped, &chatappv1.ChatRunStopped{MessageId: messageID, Status: "stopped"})
}

func (e *Engine) publishRunFailed(ctx context.Context, sid sessionstream.SessionId, pub sessionstream.EventPublisher, messageID, errorText string) {
	_ = publish(ctx, sid, pub, chatapp.EventChatRunFailed, &chatappv1.ChatRunFailed{MessageId: messageID, Status: "failed", Error: errorText})
}

func publish(ctx context.Context, sid sessionstream.SessionId, pub sessionstream.EventPublisher, name string, payload proto.Message) error {
	return pub.Publish(ctx, sessionstream.Event{Name: name, SessionId: sid, Payload: payload})
}

func (e *Engine) matchResponse(prompt string) Response {
	for _, resp := range e.responses {
		if strings.Contains(strings.ToLower(prompt), strings.ToLower(resp.Pattern)) {
			return resp
		}
	}
	return Response{Text: "I'm here to help! Try asking me to 'show me boots', 'review my cart', or 'checkout'."}
}

func (e *Engine) nextMessageID() string {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.nextID++
	return fmt.Sprintf("overlay-msg-%d", e.nextID)
}

func (e *Engine) swapRun(sid sessionstream.SessionId, next *run) *run {
	e.mu.Lock()
	defer e.mu.Unlock()
	previous := e.active[sid]
	e.active[sid] = next
	return previous
}

func (e *Engine) currentRun(sid sessionstream.SessionId) *run {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.active[sid]
}

func (e *Engine) clearRun(sid sessionstream.SessionId, messageID string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	current := e.active[sid]
	if current != nil && current.messageID == messageID {
		delete(e.active, sid)
	}
}

func (e *Engine) logPublishError(err error, sid sessionstream.SessionId, messageID, eventName, prompt string) {
	log.Error().Err(err).Str("sessionId", string(sid)).Str("messageId", messageID).Str("event", eventName).Str("prompt", prompt).Msg("mock inference publish failed")
}

func chunkText(text string, size int) []string {
	if size <= 0 || len(text) <= size {
		return []string{text}
	}
	out := make([]string, 0, (len(text)+size-1)/size)
	for len(text) > 0 {
		if len(text) <= size {
			out = append(out, text)
			break
		}
		out = append(out, text[:size])
		text = text[size:]
	}
	return out
}
