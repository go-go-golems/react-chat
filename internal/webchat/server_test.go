package webchat

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	widgetv1 "github.com/go-go-golems/chat-overlay/internal/pb/proto/chatoverlay/widgets/v1"
	chatappv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/v1"
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
