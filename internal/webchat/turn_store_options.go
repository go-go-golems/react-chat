package webchat

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
	"github.com/rs/zerolog/log"
)

func openTurnStore(opts ServerOptions) (chatstore.TurnStore, func() error, error) {
	dsn := strings.TrimSpace(opts.TurnsDSN)
	dbPath := strings.TrimSpace(opts.TurnsDB)
	if dsn == "" && dbPath == "" {
		log.Debug().Msg("using in-memory chat overlay turn store")
		store := newMemoryTurnStore()
		return store, store.Close, nil
	}
	if dsn == "" {
		if dir := filepath.Dir(dbPath); dir != "" && dir != "." {
			if err := os.MkdirAll(dir, 0o755); err != nil {
				return nil, nil, fmt.Errorf("create turns db directory: %w", err)
			}
		}
		var err error
		dsn, err = chatstore.SQLiteTurnDSNForFile(dbPath)
		if err != nil {
			return nil, nil, fmt.Errorf("create turns sqlite dsn: %w", err)
		}
	}
	store, err := chatstore.NewSQLiteTurnStore(dsn)
	if err != nil {
		return nil, nil, fmt.Errorf("open sqlite turn store: %w", err)
	}
	log.Info().Str("turns_dsn", dsn).Str("turns_db", dbPath).Msg("using sqlite chat overlay turn store")
	return store, store.Close, nil
}

func closeAll(fns ...func() error) error {
	var first error
	for i := len(fns) - 1; i >= 0; i-- {
		if fns[i] == nil {
			continue
		}
		if err := fns[i](); err != nil && first == nil {
			first = err
		}
	}
	return first
}
