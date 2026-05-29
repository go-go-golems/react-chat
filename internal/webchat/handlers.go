package webchat

import (
	"net/http"
	"strings"

	mockengine "github.com/go-go-golems/chat-overlay/internal/mockengine"
	chatappv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/v1"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

func (s *Server) HandleCreateSession(w http.ResponseWriter, r *http.Request) {
	var in createSessionRequest
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "bad request"})
		return
	}
	writeJSON(w, http.StatusOK, createSessionResponse{SessionID: uuid.NewString()})
}

func (s *Server) HandleSubmitMessage(w http.ResponseWriter, r *http.Request) {
	if s == nil || s.hub == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "chat hub not initialized"})
		return
	}
	sessionID := strings.TrimSpace(r.PathValue("id"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing session id"})
		return
	}
	var in submitMessageRequest
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "bad request"})
		return
	}
	prompt := strings.TrimSpace(in.Prompt)
	if prompt == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing prompt"})
		return
	}
	sid := sessionstream.SessionId(sessionID)
	if err := s.hub.Submit(r.Context(), sid, mockengine.CommandStart, &chatappv1.StartInferenceCommand{Prompt: prompt}); err != nil {
		log.Error().Err(err).Str("sessionId", sessionID).Msg("submit prompt failed")
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, submitMessageResponse{SessionID: sessionID, Accepted: true, Status: "running"})
}

func (s *Server) HandleSessionSnapshot(w http.ResponseWriter, r *http.Request) {
	if s == nil || s.service == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "chat service not initialized"})
		return
	}
	sessionID := strings.TrimSpace(r.PathValue("id"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing session id"})
		return
	}
	snap, err := s.service.Snapshot(r.Context(), sessionstream.SessionId(sessionID))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, encodeSnapshotResponse(snap))
}

func (s *Server) HandleStopSession(w http.ResponseWriter, r *http.Request) {
	if s == nil || s.hub == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "chat hub not initialized"})
		return
	}
	sessionID := strings.TrimSpace(r.PathValue("id"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing session id"})
		return
	}
	sid := sessionstream.SessionId(sessionID)
	if err := s.hub.Submit(r.Context(), sid, mockengine.CommandStop, &chatappv1.StopInferenceCommand{}); err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, stopSessionResponse{SessionID: sessionID, Accepted: true, Status: "stop_requested"})
}

func (s *Server) HandleWS(w http.ResponseWriter, r *http.Request) {
	if s == nil || s.ws == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "websocket transport not initialized"})
		return
	}
	s.ws.ServeHTTP(w, r)
}
