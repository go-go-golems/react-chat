package webchat

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	storesqlite "github.com/go-go-golems/sessionstream/pkg/sessionstream/hydration/sqlite"
	"github.com/rs/zerolog/log"
)

func openHydrationStore(path string, reg *sessionstream.SchemaRegistry) (*storesqlite.Store, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		log.Debug().Msg("using in-memory chat overlay timeline store")
		return storesqlite.NewInMemory(reg)
	}
	if dir := filepath.Dir(path); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("create timeline db directory: %w", err)
		}
	}
	dsn, err := storesqlite.FileDSN(path)
	if err != nil {
		return nil, fmt.Errorf("create timeline sqlite dsn: %w", err)
	}
	store, err := storesqlite.New(dsn, reg)
	if err != nil {
		return nil, fmt.Errorf("open sqlite timeline store: %w", err)
	}
	log.Info().Str("timeline_db", path).Str("timeline_dsn", dsn).Msg("using sqlite chat overlay timeline store")
	return store, nil
}
