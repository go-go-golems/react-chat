package webchat

import (
	"encoding/json"
	"net/http"

	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
)

// --- Request/Response types ---

type createSessionRequest struct {
	Profile string `json:"profile,omitempty"`
}

type createSessionResponse struct {
	SessionID string `json:"sessionId"`
}

type submitMessageRequest struct {
	Prompt string `json:"prompt"`
}

type submitMessageResponse struct {
	SessionID string `json:"sessionId"`
	Accepted  bool   `json:"accepted"`
	Status    string `json:"status"`
}

type stopSessionResponse struct {
	SessionID string `json:"sessionId"`
	Accepted  bool   `json:"accepted"`
	Status    string `json:"status"`
}

type errorResponse struct {
	Error string `json:"error"`
}

type snapshotResponse struct {
	SessionID string                   `json:"sessionId"`
	Entities  []snapshotEntityResponse `json:"entities"`
}

type snapshotEntityResponse struct {
	Kind      string `json:"kind"`
	ID        string `json:"id"`
	Payload   any    `json:"payload"`
	CreatedAt int64  `json:"createdAt,omitempty"`
}

// --- Helpers ---

func decodeJSON(r *http.Request, v any) error {
	if r.Body == nil {
		return nil
	}
	defer r.Body.Close()
	err := json.NewDecoder(r.Body).Decode(v)
	if err != nil {
		// EOF is fine for empty bodies (e.g. POST /api/chat/sessions with no body)
		if _, ok := err.(*json.SyntaxError); ok || err.Error() == "EOF" {
			return nil
		}
		return err
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
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
			CreatedAt: int64(e.CreatedOrdinal),
		})
	}
	return snapshotResponse{
		SessionID: string(snap.SessionId),
		Entities:  entities,
	}
}
