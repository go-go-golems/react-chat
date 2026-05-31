package webchat

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	toolv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/frontendtools/v1"
	chatappv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/v1"
	widgetv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/widgets/v1"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
)

func TestSubmitBootsProducesAssistantMessageAndWidgetSnapshot(t *testing.T) {
	server, cleanup, err := NewServer(ServerOptions{ChunkDelay: time.Millisecond})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	defer cleanup()

	sessionID := createSession(t, server)
	submitPrompt(t, server, sessionID, "show me boots")
	waitIdle(t, server, sessionID)

	snap, err := server.service.Snapshot(context.Background(), sessionstream.SessionId(sessionID))
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}

	var sawUser, sawAssistant, sawWidget bool
	for _, entity := range snap.Entities {
		switch payload := entity.Payload.(type) {
		case *chatappv1.ChatMessageEntity:
			if payload.GetRole() == "user" && payload.GetContent() == "show me boots" {
				sawUser = true
			}
			if payload.GetRole() == "assistant" && payload.GetContent() == "Here are some great boots I found for you:" && payload.GetStatus() == "finished" {
				sawAssistant = true
			}
		case *widgetv1.WidgetInstanceEntity:
			if payload.GetWidgetName() == "ProductCarousel" && payload.GetStatus() == widgetv1.WidgetStatus_WIDGET_STATUS_READY {
				products := payload.GetProps().GetFields()["products"].GetListValue().GetValues()
				if len(products) == 3 {
					sawWidget = true
				}
			}
		}
	}
	if !sawUser {
		t.Fatalf("snapshot did not contain accepted user message: %#v", snap.Entities)
	}
	if !sawAssistant {
		t.Fatalf("snapshot did not contain finished assistant message: %#v", snap.Entities)
	}
	if !sawWidget {
		t.Fatalf("snapshot did not contain ready ProductCarousel with 3 products: %#v", snap.Entities)
	}
}

func TestFrontendToolRoundTripResumesMockRun(t *testing.T) {
	server, cleanup, err := NewServer(ServerOptions{ChunkDelay: time.Millisecond})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	defer cleanup()

	sessionID := createSession(t, server)
	postToolManifest(t, server, sessionID)
	submitPrompt(t, server, sessionID, "add boots to cart")
	waitForToolCall(t, server, sessionID)
	postToolResult(t, server, sessionID, "overlay-msg-1:tool:cart-add")
	waitIdle(t, server, sessionID)

	snap, err := server.service.Snapshot(context.Background(), sessionstream.SessionId(sessionID))
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}

	var sawTool, sawFinal bool
	for _, entity := range snap.Entities {
		switch payload := entity.Payload.(type) {
		case *toolv1.FrontendToolCallEntity:
			if payload.GetToolName() == "cart.add" && payload.GetStatus() == "success" {
				if payload.GetResult().AsMap()["cartCount"] == float64(1) {
					sawTool = true
				}
			}
		case *chatappv1.ChatMessageEntity:
			if payload.GetRole() == "assistant" && payload.GetContent() == "The browser ran cart.add and the demo cart now contains 1 item(s)." {
				sawFinal = true
			}
		}
	}
	if !sawTool {
		t.Fatalf("snapshot did not contain completed frontend tool call: %#v", snap.Entities)
	}
	if !sawFinal {
		t.Fatalf("snapshot did not contain resumed assistant confirmation: %#v", snap.Entities)
	}
}

func TestHumanToolRoundTripResumesMockRun(t *testing.T) {
	server, cleanup, err := NewServer(ServerOptions{ChunkDelay: time.Millisecond})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	defer cleanup()

	sessionID := createSession(t, server)
	postToolManifestWithTools(t, server, sessionID, []map[string]any{{
		"name":        "checkout.confirm",
		"description": "Ask for checkout approval",
		"mode":        "human",
		"available":   true,
		"inputSchema": map[string]any{"type": "object"},
	}})
	submitPrompt(t, server, sessionID, "approve checkout")
	waitForNamedToolCall(t, server, sessionID, "checkout.confirm", "requested")
	postNamedToolResult(t, server, sessionID, "overlay-msg-1:tool:checkout-confirm", "checkout.confirm", map[string]any{"approved": true, "approvalCount": float64(1)})
	waitIdle(t, server, sessionID)

	snap, err := server.service.Snapshot(context.Background(), sessionstream.SessionId(sessionID))
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}

	var sawTool, sawFinal bool
	for _, entity := range snap.Entities {
		switch payload := entity.Payload.(type) {
		case *toolv1.FrontendToolCallEntity:
			if payload.GetToolName() == "checkout.confirm" && payload.GetStatus() == "success" {
				sawTool = true
			}
		case *chatappv1.ChatMessageEntity:
			if payload.GetRole() == "assistant" && payload.GetContent() == "Checkout approval returned approved=true; approval count is now 1." {
				sawFinal = true
			}
		}
	}
	if !sawTool {
		t.Fatalf("snapshot did not contain completed human tool call: %#v", snap.Entities)
	}
	if !sawFinal {
		t.Fatalf("snapshot did not contain checkout approval confirmation: %#v", snap.Entities)
	}
}

func TestStopCancelsCustomMockRun(t *testing.T) {
	server, cleanup, err := NewServer(ServerOptions{ChunkDelay: 5 * time.Millisecond})
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	defer cleanup()

	sessionID := createSession(t, server)
	submitPrompt(t, server, sessionID, "long response")
	time.Sleep(20 * time.Millisecond)
	stopSession(t, server, sessionID)
	waitIdle(t, server, sessionID)

	snap, err := server.service.Snapshot(context.Background(), sessionstream.SessionId(sessionID))
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}
	for _, entity := range snap.Entities {
		payload, ok := entity.Payload.(*chatappv1.ChatMessageEntity)
		if !ok || payload.GetRole() != "assistant" {
			continue
		}
		if payload.GetStatus() == "stopped" {
			return
		}
	}
	t.Fatalf("snapshot did not contain stopped assistant message: %#v", snap.Entities)
}

func createSession(t *testing.T, server *Server) string {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/chat/sessions", bytes.NewBufferString(`{}`))
	server.Mux().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("create session status=%d body=%s", rec.Code, rec.Body.String())
	}
	var out createSessionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if out.SessionID == "" {
		t.Fatalf("missing session id")
	}
	return out.SessionID
}

func submitPrompt(t *testing.T, server *Server, sessionID, prompt string) {
	t.Helper()
	rec := httptest.NewRecorder()
	body, _ := json.Marshal(map[string]string{"prompt": prompt})
	req := httptest.NewRequest(http.MethodPost, "/api/chat/sessions/"+sessionID+"/messages", bytes.NewReader(body))
	server.Mux().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("submit status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func postToolManifest(t *testing.T, server *Server, sessionID string) {
	t.Helper()
	postToolManifestWithTools(t, server, sessionID, []map[string]any{{
		"name":        "cart.add",
		"description": "Add an item to the browser cart",
		"mode":        "frontend",
		"available":   true,
		"inputSchema": map[string]any{"type": "object"},
	}})
}

func postToolManifestWithTools(t *testing.T, server *Server, sessionID string, tools []map[string]any) {
	t.Helper()
	rec := httptest.NewRecorder()
	body, _ := json.Marshal(map[string]any{
		"revision": 1,
		"tools":    tools,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/chat/sessions/"+sessionID+"/tools/manifest", bytes.NewReader(body))
	server.Mux().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tool manifest status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func postToolResult(t *testing.T, server *Server, sessionID, toolCallID string) {
	t.Helper()
	postNamedToolResult(t, server, sessionID, toolCallID, "cart.add", map[string]any{"ok": true, "cartCount": float64(1)})
}

func postNamedToolResult(t *testing.T, server *Server, sessionID, toolCallID, toolName string, result map[string]any) {
	t.Helper()
	rec := httptest.NewRecorder()
	body, _ := json.Marshal(map[string]any{
		"toolCallId": toolCallID,
		"toolName":   toolName,
		"status":     "success",
		"result":     result,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/chat/sessions/"+sessionID+"/tools/results", bytes.NewReader(body))
	server.Mux().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tool result status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func waitForToolCall(t *testing.T, server *Server, sessionID string) {
	t.Helper()
	waitForNamedToolCall(t, server, sessionID, "cart.add", "requested")
}

func waitForNamedToolCall(t *testing.T, server *Server, sessionID, toolName, status string) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		snap, err := server.service.Snapshot(context.Background(), sessionstream.SessionId(sessionID))
		if err != nil {
			t.Fatalf("Snapshot: %v", err)
		}
		for _, entity := range snap.Entities {
			payload, ok := entity.Payload.(*toolv1.FrontendToolCallEntity)
			if ok && payload.GetToolName() == toolName && payload.GetStatus() == status {
				return
			}
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s tool call with status %s", toolName, status)
}

func stopSession(t *testing.T, server *Server, sessionID string) {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/chat/sessions/"+sessionID+"/stop", nil)
	server.Mux().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("stop status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func waitIdle(t *testing.T, server *Server, sessionID string) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := server.MockEngine().WaitIdle(ctx, sessionstream.SessionId(sessionID)); err != nil {
		t.Fatalf("WaitIdle: %v", err)
	}
}
