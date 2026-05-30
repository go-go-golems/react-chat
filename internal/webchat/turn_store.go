package webchat

import (
	"context"
	"sort"
	"strings"
	"sync"

	"github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
)

type memoryTurnStore struct {
	mu    sync.RWMutex
	turns []chatstore.TurnSnapshot
}

func newMemoryTurnStore() *memoryTurnStore {
	return &memoryTurnStore{}
}

func (s *memoryTurnStore) Save(_ context.Context, convID, sessionID, turnID, phase string, createdAtMs int64, payload string, opts chatstore.TurnSaveOptions) error {
	if s == nil {
		return nil
	}
	snap := chatstore.TurnSnapshot{
		ConvID:      strings.TrimSpace(convID),
		SessionID:   strings.TrimSpace(sessionID),
		TurnID:      strings.TrimSpace(turnID),
		Phase:       strings.TrimSpace(phase),
		RuntimeKey:  strings.TrimSpace(opts.RuntimeKey),
		InferenceID: strings.TrimSpace(opts.InferenceID),
		CreatedAtMs: createdAtMs,
		Payload:     payload,
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.turns {
		if s.turns[i].ConvID == snap.ConvID && s.turns[i].SessionID == snap.SessionID && s.turns[i].TurnID == snap.TurnID && s.turns[i].Phase == snap.Phase {
			s.turns[i] = snap
			return nil
		}
	}
	s.turns = append(s.turns, snap)
	return nil
}

func (s *memoryTurnStore) List(_ context.Context, q chatstore.TurnQuery) ([]chatstore.TurnSnapshot, error) {
	if s == nil {
		return nil, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]chatstore.TurnSnapshot, 0, len(s.turns))
	for _, snap := range s.turns {
		if q.ConvID != "" && snap.ConvID != q.ConvID {
			continue
		}
		if q.SessionID != "" && snap.SessionID != q.SessionID {
			continue
		}
		if q.Phase != "" && snap.Phase != q.Phase {
			continue
		}
		if q.SinceMs > 0 && snap.CreatedAtMs < q.SinceMs {
			continue
		}
		out = append(out, snap)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].CreatedAtMs < out[j].CreatedAtMs
	})
	if q.Limit > 0 && len(out) > q.Limit {
		out = out[len(out)-q.Limit:]
	}
	return out, nil
}

func (s *memoryTurnStore) LoadLatestTurn(_ context.Context, convID, phase string) (*chatstore.TurnSnapshot, error) {
	if s == nil {
		return nil, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	var latest *chatstore.TurnSnapshot
	for i := range s.turns {
		snap := s.turns[i]
		if convID != "" && snap.ConvID != convID {
			continue
		}
		if phase != "" && snap.Phase != phase {
			continue
		}
		if latest == nil || snap.CreatedAtMs > latest.CreatedAtMs {
			copy := snap
			latest = &copy
		}
	}
	return latest, nil
}

func (s *memoryTurnStore) Close() error { return nil }
