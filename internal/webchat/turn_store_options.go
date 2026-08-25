package webchat

import (
	"context"
	"strings"

	"github.com/go-go-golems/pinocchio/pkg/chatapp/serverkit"
	"github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
	"github.com/rs/zerolog/log"
)

func openTurnStore(opts ServerOptions) (chatstore.TurnStore, func() error, error) {
	turnsDSN := strings.TrimSpace(opts.TurnsDSN)
	turnsDB := strings.TrimSpace(opts.TurnsDB)
	spec := serverkit.StoreSpec{Backend: serverkit.StoreBackendMemory}
	if turnsDSN != "" || turnsDB != "" {
		spec = serverkit.StoreSpec{
			Backend: serverkit.StoreBackendSQLite,
			DSN:     turnsDSN,
			Path:    turnsDB,
		}
	}
	store, closeFn, err := serverkit.OpenTurnStore(context.Background(), serverkit.StoreOptions{Turns: spec})
	if err != nil {
		return nil, nil, err
	}
	if turnsDSN == "" && turnsDB == "" {
		log.Debug().Msg("using in-memory chat overlay turn store")
	} else {
		log.Info().Str("turns_dsn", turnsDSN).Str("turns_db", turnsDB).Msg("using sqlite chat overlay turn store")
	}
	return store, closeFn, nil
}

func closeAll(fns ...func() error) error {
	return serverkit.CloseAll(fns...)
}
