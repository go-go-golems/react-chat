package webchat

import (
	"context"
	"net/http"
	"strings"
	"time"

	chatapp "github.com/go-go-golems/pinocchio/pkg/chatapp"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	wstransport "github.com/go-go-golems/sessionstream/pkg/sessionstream/transport/ws"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// ServerOptions configures the chat overlay server.
type ServerOptions struct {
	TimelineDB string        // path to SQLite database (empty = in-memory)
	ChunkDelay time.Duration // delay between streaming token chunks
}

// Server holds all chat overlay dependencies.
type Server struct {
	runner  *chatapp.Runner
	ws      *wstransport.Server
	closeFn func() error
}

// NewServer creates a fully wired chat overlay server.
// Returns the server and a cleanup function.
func NewServer(opts ServerOptions) (*Server, func() error, error) {
	runner, err := chatapp.NewRunner(chatapp.RunnerOptions{
		ChunkDelay: opts.ChunkDelay,
	})
	if err != nil {
		return nil, nil, err
	}

	// Create WebSocket transport server for live event fanout.
	// The snapshot provider reads from the hydration store.
	ws, err := wstransport.NewServer(snapshotProvider{store: runner.Store})
	if err != nil {
		_ = runner.Close()
		return nil, nil, err
	}

	return &Server{
			runner:  runner,
			ws:      ws,
			closeFn: runner.Close,
		}, runner.Close, nil
}

// Mux returns a fully configured HTTP mux with all routes.
func (s *Server) Mux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/chat/sessions", s.HandleCreateSession)
	mux.HandleFunc("POST /api/chat/sessions/{id}/messages", s.HandleSubmitMessage)
	mux.HandleFunc("GET /api/chat/sessions/{id}", s.HandleSessionSnapshot)
	mux.HandleFunc("POST /api/chat/sessions/{id}/stop", s.HandleStopSession)
	mux.HandleFunc("GET /api/chat/ws", s.HandleWS)
	return mux
}

// Close releases server resources.
func (s *Server) Close() error {
	if s == nil || s.closeFn == nil {
		return nil
	}
	return s.closeFn()
}

// HandleCreateSession creates a new chat session and returns the session ID.
func (s *Server) HandleCreateSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	var in createSessionRequest
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "bad request"})
		return
	}

	sessionID := uuid.NewString()
	writeJSON(w, http.StatusOK, createSessionResponse{
		SessionID: sessionID,
	})
}

// HandleSubmitMessage submits a user prompt for inference.
func (s *Server) HandleSubmitMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}
	if s.runner == nil || s.runner.Service == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "chat service not initialized"})
		return
	}

	sessionID := r.PathValue("id")
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing session id"})
		return
	}

	var in submitMessageRequest
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "bad request"})
		return
	}

	in.Prompt = strings.TrimSpace(in.Prompt)
	if in.Prompt == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing prompt"})
		return
	}

	sid := sessionstream.SessionId(sessionID)
	if err := s.runner.Service.SubmitPrompt(r.Context(), sid, in.Prompt); err != nil {
		log.Error().Err(err).Str("sessionId", sessionID).Msg("submit prompt failed")
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, submitMessageResponse{
		SessionID: sessionID,
		Accepted:  true,
		Status:    "running",
	})
}

// HandleSessionSnapshot returns the current timeline snapshot for a session.
func (s *Server) HandleSessionSnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}
	if s.runner == nil || s.runner.Service == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "chat service not initialized"})
		return
	}

	sessionID := r.PathValue("id")
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing session id"})
		return
	}

	sid := sessionstream.SessionId(sessionID)
	snap, err := s.runner.Service.Snapshot(r.Context(), sid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, encodeSnapshotResponse(snap))
}

// HandleStopSession cancels the active inference run for a session.
func (s *Server) HandleStopSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}
	if s.runner == nil || s.runner.Service == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "chat service not initialized"})
		return
	}

	sessionID := r.PathValue("id")
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing session id"})
		return
	}

	sid := sessionstream.SessionId(sessionID)
	if err := s.runner.Service.Stop(r.Context(), sid); err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, stopSessionResponse{
		SessionID: sessionID,
		Accepted:  true,
		Status:    "stop_requested",
	})
}

// HandleWS serves the WebSocket endpoint for live event streaming.
func (s *Server) HandleWS(w http.ResponseWriter, r *http.Request) {
	if s == nil || s.ws == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "websocket transport not initialized"})
		return
	}
	s.ws.ServeHTTP(w, r)
}

// snapshotProvider adapts the hydration store to the wstransport.SnapshotProvider interface.
type snapshotProvider struct {
	store sessionstream.HydrationStore
}

func (p snapshotProvider) Snapshot(ctx context.Context, sid sessionstream.SessionId) (sessionstream.Snapshot, error) {
	return p.store.Snapshot(ctx, sid, 0)
}
