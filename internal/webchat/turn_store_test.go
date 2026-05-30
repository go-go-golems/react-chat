package webchat

import (
	"context"
	"testing"

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
