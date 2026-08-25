package webchat

import (
	"net/http"
	"strings"

	"github.com/go-go-golems/pinocchio/pkg/chatapp/frontendtools"
	toolv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/frontendtools/v1"
	chatappv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/v1"
	mockengine "github.com/go-go-golems/react-chat/internal/mockengine"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"google.golang.org/protobuf/types/known/structpb"
)

func (s *Server) HandleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

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
	if s.realRuntime != nil {
		req, err := s.realRuntime.promptRequest(r.Context(), sid, prompt)
		if err != nil {
			log.Error().Err(err).Str("sessionId", sessionID).Msg("create real runtime prompt request failed")
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
			return
		}
		if err := s.service.SubmitPromptRequest(r.Context(), sid, req); err != nil {
			log.Error().Err(err).Str("sessionId", sessionID).Msg("submit real prompt failed")
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, submitMessageResponse{SessionID: sessionID, Accepted: true, Status: "running"})
		return
	}
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
	if s.realRuntime != nil {
		if err := s.service.Stop(r.Context(), sid); err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, stopSessionResponse{SessionID: sessionID, Accepted: true, Status: "stop_requested"})
		return
	}
	if err := s.hub.Submit(r.Context(), sid, mockengine.CommandStop, &chatappv1.StopInferenceCommand{}); err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, stopSessionResponse{SessionID: sessionID, Accepted: true, Status: "stop_requested"})
}

func (s *Server) HandleToolManifest(w http.ResponseWriter, r *http.Request) {
	if s == nil || s.hub == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "chat hub not initialized"})
		return
	}
	sessionID := strings.TrimSpace(r.PathValue("id"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing session id"})
		return
	}
	var in toolManifestRequest
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "bad request"})
		return
	}
	tools := make([]*toolv1.FrontendToolDescriptor, 0, len(in.Tools))
	for _, t := range in.Tools {
		name := strings.TrimSpace(t.Name)
		if name == "" {
			continue
		}
		inputSchema, err := structpb.NewStruct(t.InputSchema)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "bad input schema"})
			return
		}
		tools = append(tools, &toolv1.FrontendToolDescriptor{
			Name:        name,
			Description: t.Description,
			InputSchema: inputSchema,
			Mode:        parseToolMode(t.Mode),
			Available:   t.Available,
		})
	}
	if s.frontendToolManager == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "frontend tools not initialized"})
		return
	}
	updated, err := s.frontendToolManager.AcceptManifest(r.Context(), sessionstream.SessionId(sessionID), s.hub, &toolv1.FrontendToolManifestCommand{
		Tools:            tools,
		Revision:         in.Revision,
		ClientInstanceId: strings.TrimSpace(in.ClientInstanceID),
		ConnectionId:     strings.TrimSpace(in.ConnectionID),
	})
	if err != nil {
		writeJSON(w, toolManifestErrorStatus(err), errorResponse{Error: err.Error()})
		return
	}
	executor := frontendToolExecutorFromProto(updated.GetExecutor())
	writeJSON(w, http.StatusOK, toolCommandResponse{
		SessionID: sessionID,
		Accepted:  true,
		Status:    "manifest_updated",
		Revision:  updated.GetRevision(),
		Executor:  &executor,
	})
}

func (s *Server) HandleToolResult(w http.ResponseWriter, r *http.Request) {
	if s == nil || s.hub == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "chat hub not initialized"})
		return
	}
	sessionID := strings.TrimSpace(r.PathValue("id"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing session id"})
		return
	}
	var in toolResultRequest
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "bad request"})
		return
	}
	if strings.TrimSpace(in.ToolCallID) == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing toolCallId"})
		return
	}
	result, err := structpb.NewStruct(in.Result)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "bad result"})
		return
	}
	status := strings.TrimSpace(in.Status)
	if status == "" {
		status = "success"
	}
	if err := s.hub.Submit(r.Context(), sessionstream.SessionId(sessionID), frontendtools.CommandResult, &toolv1.FrontendToolResultCommand{
		ToolCallId: strings.TrimSpace(in.ToolCallID),
		ToolName:   strings.TrimSpace(in.ToolName),
		Result:     result,
		Status:     status,
		Error:      in.Error,
		Executor:   in.Executor.toProto(),
	}); err != nil {
		writeJSON(w, toolResultErrorStatus(err), errorResponse{Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, toolCommandResponse{SessionID: sessionID, Accepted: true, Status: "result_received"})
}

func toolManifestErrorStatus(err error) int {
	code, ok := frontendtools.ManifestErrorCodeOf(err)
	if !ok {
		return http.StatusInternalServerError
	}
	switch code {
	case frontendtools.ManifestErrorIdentityMissing, frontendtools.ManifestErrorIdentityTooLong:
		return http.StatusBadRequest
	case frontendtools.ManifestErrorRevisionRegression, frontendtools.ManifestErrorRevisionConflict:
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}

func toolResultErrorStatus(err error) int {
	code, ok := frontendtools.InvocationErrorCodeOf(err)
	if !ok {
		return http.StatusInternalServerError
	}
	switch code {
	case frontendtools.InvocationErrorInvalidStatus, frontendtools.InvocationErrorExecutorMissing:
		return http.StatusBadRequest
	case frontendtools.InvocationErrorUnknownResult:
		return http.StatusNotFound
	case frontendtools.InvocationErrorLateResult:
		return http.StatusGone
	case frontendtools.InvocationErrorDuplicatePending,
		frontendtools.InvocationErrorSessionMismatch,
		frontendtools.InvocationErrorToolMismatch,
		frontendtools.InvocationErrorTerminalConflict,
		frontendtools.InvocationErrorKeyReuse,
		frontendtools.InvocationErrorExecutorMismatch,
		frontendtools.InvocationErrorExecutorUnavailable:
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}

func (executor frontendToolExecutor) toProto() *toolv1.FrontendToolExecutor {
	return &toolv1.FrontendToolExecutor{
		ClientInstanceId: strings.TrimSpace(executor.ClientInstanceID),
		ConnectionId:     strings.TrimSpace(executor.ConnectionID),
		AssignmentId:     strings.TrimSpace(executor.AssignmentID),
	}
}

func frontendToolExecutorFromProto(executor *toolv1.FrontendToolExecutor) frontendToolExecutor {
	return frontendToolExecutor{
		ClientInstanceID: executor.GetClientInstanceId(),
		ConnectionID:     executor.GetConnectionId(),
		AssignmentID:     executor.GetAssignmentId(),
	}
}

func parseToolMode(mode string) toolv1.ToolExecutionMode {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "frontend", "frontend_auto", "auto":
		return toolv1.ToolExecutionMode_TOOL_EXECUTION_MODE_FRONTEND_AUTO
	case "human", "frontend_human":
		return toolv1.ToolExecutionMode_TOOL_EXECUTION_MODE_FRONTEND_HUMAN
	case "backend":
		return toolv1.ToolExecutionMode_TOOL_EXECUTION_MODE_BACKEND
	default:
		return toolv1.ToolExecutionMode_TOOL_EXECUTION_MODE_FRONTEND_AUTO
	}
}

func (s *Server) HandleWS(w http.ResponseWriter, r *http.Request) {
	if s == nil || s.ws == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "websocket transport not initialized"})
		return
	}
	s.ws.ServeHTTP(w, r)
}
