package webchat

import (
	"github.com/go-go-golems/pinocchio/pkg/chatapp/serverkit"
	"github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
	"github.com/rs/zerolog/log"
)

func openTurnStore(opts ServerOptions) (chatstore.TurnStore, func() error, error) {
	store, closeFn, err := serverkit.OpenTurnStore(serverkit.StoreOptions{
		TurnsDSN:       opts.TurnsDSN,
		TurnsDB:        opts.TurnsDB,
		EmptyTurnStore: serverkit.EmptyTurnStoreMemory,
	})
	if err != nil {
		return nil, nil, err
	}
	if opts.TurnsDSN == "" && opts.TurnsDB == "" {
		log.Debug().Msg("using in-memory chat overlay turn store")
	} else {
		log.Info().Str("turns_dsn", opts.TurnsDSN).Str("turns_db", opts.TurnsDB).Msg("using sqlite chat overlay turn store")
	}
	return store, closeFn, nil
}

func closeAll(fns ...func() error) error {
	return serverkit.CloseAll(fns...)
}
