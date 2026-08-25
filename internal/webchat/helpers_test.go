package webchat

import (
	"math"
	"testing"

	"github.com/go-go-golems/sessionstream/pkg/sessionstream"
)

func TestEncodeSnapshotResponsePreservesCreatedOrdinal(t *testing.T) {
	response := encodeSnapshotResponse(sessionstream.Snapshot{
		SessionId: "session-1",
		Entities: []sessionstream.TimelineEntity{{
			Kind:           "test",
			Id:             "entity-1",
			CreatedOrdinal: math.MaxUint64,
		}},
	})

	if len(response.Entities) != 1 {
		t.Fatalf("expected one entity, got %d", len(response.Entities))
	}
	if response.Entities[0].CreatedAt != math.MaxUint64 {
		t.Fatalf("created ordinal changed: got %d want %d", response.Entities[0].CreatedAt, uint64(math.MaxUint64))
	}
}
