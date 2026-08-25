package webchat

import (
	"net/http"

	"github.com/go-go-golems/pinocchio/pkg/chatapp/serverkit"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
)

// --- Request/Response types ---

type createSessionRequest = serverkit.CreateSessionRequest

type createSessionResponse = serverkit.CreateSessionResponse

type submitMessageRequest = serverkit.SubmitMessageRequest

type submitMessageResponse = serverkit.SubmitMessageResponse

type stopSessionResponse = serverkit.StopSessionResponse

type toolDescriptorRequest struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	InputSchema map[string]any `json:"inputSchema,omitempty"`
	Mode        string         `json:"mode,omitempty"`
	Available   bool           `json:"available"`
}

type toolManifestRequest struct {
	ClientInstanceID string                  `json:"clientInstanceId"`
	ConnectionID     string                  `json:"connectionId"`
	Revision         uint64                  `json:"revision,omitempty"`
	Tools            []toolDescriptorRequest `json:"tools"`
}

type frontendToolExecutor struct {
	ClientInstanceID string `json:"clientInstanceId"`
	ConnectionID     string `json:"connectionId"`
	AssignmentID     string `json:"assignmentId"`
}

type toolResultRequest struct {
	ToolCallID string               `json:"toolCallId"`
	ToolName   string               `json:"toolName,omitempty"`
	Result     map[string]any       `json:"result,omitempty"`
	Status     string               `json:"status,omitempty"`
	Error      string               `json:"error,omitempty"`
	Executor   frontendToolExecutor `json:"executor"`
}

type toolCommandResponse struct {
	SessionID string                `json:"sessionId"`
	Accepted  bool                  `json:"accepted"`
	Status    string                `json:"status"`
	Revision  uint64                `json:"revision,omitempty"`
	Executor  *frontendToolExecutor `json:"executor,omitempty"`
}

type errorResponse = serverkit.ErrorResponse

type snapshotResponse struct {
	SessionID string                   `json:"sessionId"`
	Entities  []snapshotEntityResponse `json:"entities"`
}

type snapshotEntityResponse struct {
	Kind      string `json:"kind"`
	ID        string `json:"id"`
	Payload   any    `json:"payload"`
	CreatedAt uint64 `json:"createdAt,omitempty"`
}

// --- Helpers ---

func decodeJSON(r *http.Request, v any) error {
	return serverkit.DecodeJSON(r, v)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	serverkit.WriteJSON(w, status, v)
}

func encodeSnapshotResponse(snap sessionstream.Snapshot) snapshotResponse {
	entities := make([]snapshotEntityResponse, 0, len(snap.Entities))
	for _, e := range snap.Entities {
		var payload any
		if e.Payload != nil {
			payload = e.Payload
		}
		entities = append(entities, snapshotEntityResponse{
			Kind:      e.Kind,
			ID:        e.Id,
			Payload:   payload,
			CreatedAt: e.CreatedOrdinal,
		})
	}
	return snapshotResponse{
		SessionID: string(snap.SessionId),
		Entities:  entities,
	}
}
