package webchat

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/go-go-golems/chat-overlay/internal/frontendtools"
	mockengine "github.com/go-go-golems/chat-overlay/internal/mockengine"
	"github.com/go-go-golems/chat-overlay/internal/widgets"
	chatapp "github.com/go-go-golems/pinocchio/pkg/chatapp"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	storesqlite "github.com/go-go-golems/sessionstream/pkg/sessionstream/hydration/sqlite"
	wstransport "github.com/go-go-golems/sessionstream/pkg/sessionstream/transport/ws"
)

// ServerOptions configures the chat overlay server.
type ServerOptions struct {
	TimelineDB string
	ChunkDelay time.Duration
}

// Server holds the HTTP-facing dependencies for the chat overlay backend.
type Server struct {
	hub        *sessionstream.Hub
	service    *chatapp.Service
	mockEngine *mockengine.Engine
	ws         *wstransport.Server
	closeFn    func() error
}

// NewServer creates a fully wired chat overlay server.
func NewServer(opts ServerOptions) (*Server, func() error, error) {
	widgetPlugin := widgets.NewWidgetPlugin()
	frontendToolPlugin := frontendtools.NewPlugin()
	frontendToolManager := frontendtools.NewManager()
	reg := sessionstream.NewSchemaRegistry()
	if err := chatapp.RegisterSchemas(reg, widgetPlugin, frontendToolPlugin); err != nil {
		return nil, nil, fmt.Errorf("register chat schemas: %w", err)
	}
	if err := mockengine.RegisterSchemas(reg); err != nil {
		return nil, nil, fmt.Errorf("register mock engine schemas: %w", err)
	}

	store, err := storesqlite.NewInMemory(reg)
	if err != nil {
		return nil, nil, fmt.Errorf("create hydration store: %w", err)
	}

	ws, err := wstransport.NewServer(snapshotProvider{store: store})
	if err != nil {
		_ = store.Close()
		return nil, nil, fmt.Errorf("create websocket transport: %w", err)
	}

	chatEngine := chatapp.NewEngine(
		chatapp.WithChunkDelay(opts.effectiveChunkDelay()),
		chatapp.WithPlugins(widgetPlugin, frontendToolPlugin),
	)
	mockEngine := mockengine.New(
		mockengine.WithChunkDelay(opts.effectiveChunkDelay()),
		mockengine.WithFrontendTools(frontendToolManager),
	)

	hub, err := sessionstream.NewHub(
		sessionstream.WithSchemaRegistry(reg),
		sessionstream.WithHydrationStore(store),
		sessionstream.WithUIFanout(ws),
	)
	if err != nil {
		_ = store.Close()
		return nil, nil, fmt.Errorf("create hub: %w", err)
	}
	if err := frontendToolManager.Install(hub); err != nil {
		_ = store.Close()
		return nil, nil, fmt.Errorf("install frontend tools: %w", err)
	}
	if err := mockEngine.Install(hub); err != nil {
		_ = store.Close()
		return nil, nil, fmt.Errorf("install mock engine: %w", err)
	}
	if err := chatapp.Install(hub, chatEngine); err != nil {
		_ = store.Close()
		return nil, nil, fmt.Errorf("install chatapp projections: %w", err)
	}
	service, err := chatapp.NewService(hub, chatEngine)
	if err != nil {
		_ = store.Close()
		return nil, nil, fmt.Errorf("create service: %w", err)
	}

	server := &Server{hub: hub, service: service, mockEngine: mockEngine, ws: ws, closeFn: store.Close}
	return server, store.Close, nil
}

func (opts ServerOptions) effectiveChunkDelay() time.Duration {
	if opts.ChunkDelay > 0 {
		return opts.ChunkDelay
	}
	return 20 * time.Millisecond
}

// Mux returns a fully configured HTTP mux with all routes.
func (s *Server) Mux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/chat/sessions", s.HandleCreateSession)
	mux.HandleFunc("POST /api/chat/sessions/{id}/messages", s.HandleSubmitMessage)
	mux.HandleFunc("GET /api/chat/sessions/{id}", s.HandleSessionSnapshot)
	mux.HandleFunc("POST /api/chat/sessions/{id}/stop", s.HandleStopSession)
	mux.HandleFunc("POST /api/chat/sessions/{id}/tools/manifest", s.HandleToolManifest)
	mux.HandleFunc("POST /api/chat/sessions/{id}/tools/results", s.HandleToolResult)
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

// MockEngine exposes the mock engine for tests.
func (s *Server) MockEngine() *mockengine.Engine {
	if s == nil {
		return nil
	}
	return s.mockEngine
}

// snapshotProvider adapts the hydration store to the websocket transport.
type snapshotProvider struct {
	store sessionstream.HydrationStore
}

func (p snapshotProvider) Snapshot(ctx context.Context, sid sessionstream.SessionId) (sessionstream.Snapshot, error) {
	return p.store.Snapshot(ctx, sid, 0)
}
