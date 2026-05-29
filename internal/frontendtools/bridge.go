package frontendtools

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	toolv1 "github.com/go-go-golems/chat-overlay/internal/pb/proto/chatoverlay/tools/v1"
	geptools "github.com/go-go-golems/geppetto/pkg/inference/tools"
	"github.com/go-go-golems/sessionstream/pkg/sessionstream"
	"github.com/invopop/jsonschema"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"
)

type bridgeContextKey struct{}

// BridgeContext carries the per-run sessionstream handles a Geppetto tool
// executor needs in order to turn a model tool call into a browser request.
type BridgeContext struct {
	SessionID sessionstream.SessionId
	MessageID string
	Publisher sessionstream.EventPublisher
}

func WithBridgeContext(ctx context.Context, bridge BridgeContext) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, bridgeContextKey{}, bridge)
}

func BridgeContextFromContext(ctx context.Context) (BridgeContext, bool) {
	if ctx == nil {
		return BridgeContext{}, false
	}
	bridge, ok := ctx.Value(bridgeContextKey{}).(BridgeContext)
	return bridge, ok
}

// BridgeExecutor adapts browser-registered frontend tools to Geppetto's
// ToolExecutor interface. Calls for tools present in the frontend manifest are
// routed through Manager.Request; all other calls delegate to Fallback.
type BridgeExecutor struct {
	Manager  *Manager
	Fallback geptools.ToolExecutor
}

func NewBridgeExecutor(manager *Manager, fallback geptools.ToolExecutor) *BridgeExecutor {
	if fallback == nil {
		fallback = geptools.NewDefaultToolExecutor(geptools.DefaultToolConfig())
	}
	return &BridgeExecutor{Manager: manager, Fallback: fallback}
}

func (e *BridgeExecutor) ExecuteToolCall(ctx context.Context, call geptools.ToolCall, registry geptools.ToolRegistry) (*geptools.ToolResult, error) {
	start := time.Now()
	bridge, ok := BridgeContextFromContext(ctx)
	if !ok || bridge.SessionID == "" || bridge.Publisher == nil || e == nil || e.Manager == nil || !e.Manager.HasAvailableTool(bridge.SessionID, call.Name) {
		return e.fallback().ExecuteToolCall(ctx, call, registry)
	}

	input := map[string]any{}
	if len(call.Arguments) > 0 {
		if err := json.Unmarshal(call.Arguments, &input); err != nil {
			return &geptools.ToolResult{ID: call.ID, Error: fmt.Sprintf("decode frontend tool arguments: %v", err), Duration: time.Since(start)}, nil
		}
	}

	desc, _ := e.Manager.Descriptor(bridge.SessionID, call.Name)
	mode := toolv1.ToolExecutionMode_TOOL_EXECUTION_MODE_FRONTEND_AUTO
	if desc != nil && desc.GetMode() != toolv1.ToolExecutionMode_TOOL_EXECUTION_MODE_UNSPECIFIED {
		mode = desc.GetMode()
	}
	result, err := e.Manager.Request(ctx, bridge.SessionID, bridge.Publisher, Request{
		MessageID:  bridge.MessageID,
		ToolCallID: call.ID,
		ToolName:   call.Name,
		Input:      input,
		Mode:       mode,
	})
	if err != nil {
		return &geptools.ToolResult{ID: call.ID, Error: err.Error(), Duration: time.Since(start)}, nil
	}
	out := map[string]any{}
	if result.GetResult() != nil {
		out = result.GetResult().AsMap()
	}
	status := result.GetStatus()
	if status == "" {
		status = "success"
	}
	toolResult := &geptools.ToolResult{ID: call.ID, Result: out, Duration: time.Since(start)}
	if status != "success" {
		if result.GetError() != "" {
			toolResult.Error = result.GetError()
		} else {
			toolResult.Error = fmt.Sprintf("frontend tool returned status %s", status)
		}
	}
	return toolResult, nil
}

func (e *BridgeExecutor) ExecuteToolCalls(ctx context.Context, calls []geptools.ToolCall, registry geptools.ToolRegistry) ([]*geptools.ToolResult, error) {
	out := make([]*geptools.ToolResult, 0, len(calls))
	for _, call := range calls {
		result, err := e.ExecuteToolCall(ctx, call, registry)
		if err != nil {
			return out, err
		}
		out = append(out, result)
	}
	return out, nil
}

func (e *BridgeExecutor) fallback() geptools.ToolExecutor {
	if e != nil && e.Fallback != nil {
		return e.Fallback
	}
	return geptools.NewDefaultToolExecutor(geptools.DefaultToolConfig())
}

// RegisterManifestTools adds the browser manifest for sid to a Geppetto tool
// registry so model providers can see frontend tools as ordinary tool
// definitions. Execution still goes through BridgeExecutor.
func (m *Manager) RegisterManifestTools(sid sessionstream.SessionId, registry geptools.ToolRegistry) error {
	if registry == nil {
		return fmt.Errorf("tool registry is nil")
	}
	m.mu.Lock()
	manifest := m.manifests[sid]
	m.mu.Unlock()
	if manifest == nil {
		return nil
	}
	for _, desc := range manifest.Tools {
		if desc == nil || !desc.GetAvailable() || desc.GetName() == "" {
			continue
		}
		def := geptools.ToolDefinition{
			Name:        desc.GetName(),
			Description: desc.GetDescription(),
			Parameters:  descriptorSchema(desc),
			Tags:        []string{"frontend"},
		}
		if err := registry.RegisterTool(desc.GetName(), def); err != nil {
			return err
		}
	}
	return nil
}

func descriptorSchema(desc *toolv1.FrontendToolDescriptor) *jsonschema.Schema {
	if desc == nil || desc.GetInputSchema() == nil {
		return &jsonschema.Schema{Type: "object"}
	}
	b, err := protojson.Marshal(desc.GetInputSchema())
	if err != nil {
		return &jsonschema.Schema{Type: "object"}
	}
	var schema jsonschema.Schema
	if err := json.Unmarshal(b, &schema); err != nil {
		return &jsonschema.Schema{Type: "object"}
	}
	if schema.Type == "" && schema.Ref == "" {
		schema.Type = "object"
	}
	return &schema
}

func structFromMap(m map[string]any) *structpb.Struct {
	st, err := structpb.NewStruct(m)
	if err != nil {
		return &structpb.Struct{}
	}
	return st
}
