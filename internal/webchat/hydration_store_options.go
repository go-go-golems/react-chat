package webchat

import (
	"context"
	"fmt"
	"strings"

	"github.com/go-go-golems/pinocchio/pkg/chatapp/serverkit"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	"github.com/rs/zerolog/log"
)

func openHydrationStore(path string, reg *sessionstream.SchemaRegistry) (sessionstream.HydrationStore, func() error, error) {
	path = strings.TrimSpace(path)
	spec := serverkit.StoreSpec{Backend: serverkit.StoreBackendMemory}
	if path != "" {
		spec = serverkit.StoreSpec{Backend: serverkit.StoreBackendSQLite, Path: path}
	}
	store, closeFn, err := serverkit.OpenHydrationStore(context.Background(), spec, reg)
	if err != nil {
		return nil, nil, fmt.Errorf("open chat overlay timeline store: %w", err)
	}
	if path == "" {
		log.Debug().Msg("using in-memory chat overlay timeline store")
	} else {
		log.Info().Str("timeline_db", path).Msg("using sqlite chat overlay timeline store")
	}
	return store, closeFn, nil
}
