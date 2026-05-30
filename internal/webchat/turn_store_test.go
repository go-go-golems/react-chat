package webchat

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/go-go-golems/geppetto/pkg/turns"
	"github.com/go-go-golems/geppetto/pkg/turns/serde"
	"github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
)

func TestMemoryTurnStoreLoadLatestFinalTurn(t *testing.T) {
	store := newMemoryTurnStore()
	ctx := context.Background()
	if err := store.Save(ctx, "sess-1", "sess-1", "turn-1", "final", 100, "first", chatstore.TurnSaveOptions{RuntimeKey: "gpt-5-mini-low"}); err != nil {
		t.Fatalf("save first: %v", err)
	}
	if err := store.Save(ctx, "sess-1", "sess-1", "turn-2", "draft", 200, "draft", chatstore.TurnSaveOptions{}); err != nil {
		t.Fatalf("save draft: %v", err)
	}
	if err := store.Save(ctx, "sess-1", "sess-1", "turn-3", "final", 300, "latest", chatstore.TurnSaveOptions{RuntimeKey: "gpt-5-mini-low"}); err != nil {
		t.Fatalf("save latest: %v", err)
	}

	snap, err := store.LoadLatestTurn(ctx, "sess-1", "final")
	if err != nil {
		t.Fatalf("load latest: %v", err)
	}
	if snap == nil || snap.TurnID != "turn-3" || snap.Payload != "latest" || snap.RuntimeKey != "gpt-5-mini-low" {
		t.Fatalf("unexpected latest final snapshot: %#v", snap)
	}
}

func TestOpenTurnStoreSQLitePersistsAcrossReopen(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "turns", "chat-overlay-turns.db")
	store, closeFn, err := openTurnStore(ServerOptions{TurnsDB: dbPath})
	if err != nil {
		t.Fatalf("open sqlite turn store: %v", err)
	}
	turn := &turns.Turn{ID: "turn-1"}
	turns.AppendBlock(turn, turns.NewUserTextBlock("remember durable history"))
	payload, err := serde.ToYAML(turn, serde.Options{})
	if err != nil {
		t.Fatalf("serialize turn: %v", err)
	}
	if err := store.Save(ctx, "sess-durable", "sess-durable", "turn-1", "final", 1000, string(payload), chatstore.TurnSaveOptions{RuntimeKey: "gpt-5-mini-low"}); err != nil {
		t.Fatalf("save turn: %v", err)
	}
	if err := closeFn(); err != nil {
		t.Fatalf("close first store: %v", err)
	}

	reopened, closeReopened, err := openTurnStore(ServerOptions{TurnsDB: dbPath})
	if err != nil {
		t.Fatalf("reopen sqlite turn store: %v", err)
	}
	defer func() { _ = closeReopened() }()
	snap, err := reopened.LoadLatestTurn(ctx, "sess-durable", "final")
	if err != nil {
		t.Fatalf("load latest turn: %v", err)
	}
	if snap == nil || snap.TurnID != "turn-1" || snap.RuntimeKey != "gpt-5-mini-low" {
		t.Fatalf("unexpected durable snapshot: %#v", snap)
	}
	loaded, err := serde.FromYAML([]byte(snap.Payload))
	if err != nil {
		t.Fatalf("decode loaded turn: %v", err)
	}
	if loaded == nil || len(loaded.Blocks) != 1 || loaded.Blocks[0].Payload[turns.PayloadKeyText] != "remember durable history" {
		t.Fatalf("unexpected loaded turn: %#v", loaded)
	}
}
