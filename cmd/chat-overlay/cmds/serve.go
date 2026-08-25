package cmds

import (
	"context"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-go-golems/glazed/pkg/cli"
	"github.com/go-go-golems/glazed/pkg/cmds"
	"github.com/go-go-golems/glazed/pkg/cmds/fields"
	"github.com/go-go-golems/glazed/pkg/cmds/schema"
	"github.com/go-go-golems/glazed/pkg/cmds/values"
	"github.com/go-go-golems/pinocchio/pkg/cmds/profilebootstrap"
	"github.com/go-go-golems/react-chat/internal/webchat"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

type ServeCommand struct {
	*cmds.CommandDescription
}

var _ cmds.BareCommand = (*ServeCommand)(nil)

type ServeSettings struct {
	ServePort      string `glazed:"serve-port"`
	TimelineDB     string `glazed:"timeline-db"`
	TurnsDSN       string `glazed:"turns-dsn"`
	TurnsDB        string `glazed:"turns-db"`
	ChunkDelay     string `glazed:"chunk-delay"`
	UseRealRuntime bool   `glazed:"real-runtime"`
}

func NewServeCommand() (*ServeCommand, error) {
	commandSettingsSection, err := cli.NewCommandSettingsSection()
	if err != nil {
		return nil, errors.Wrap(err, "create command settings section")
	}
	profileSettingsSection, err := profilebootstrap.NewProfileSettingsSection()
	if err != nil {
		return nil, errors.Wrap(err, "create pinocchio profile settings section")
	}

	desc := cmds.NewCommandDescription(
		"serve",
		cmds.WithShort("Start the chat overlay server"),
		cmds.WithLong(`Start the chat overlay server.

By default this command uses the deterministic mock engine so browser and CI
smoke tests do not require model credentials. Pass --real-runtime to resolve a
Pinocchio/Geppetto profile and run real inference. Profile resolution uses the
same Pinocchio profile bootstrap infrastructure as pinocchio web-chat, including
--profile, --profile-registries, --config-file, environment variables, and the
standard ~/.config/pinocchio profile registry fallback.

Useful diagnostics:
  chat-overlay serve --print-parsed-fields
  chat-overlay serve --real-runtime --profile gpt-5-mini-low --log-level debug --with-caller
`),
		cmds.WithFlags(
			fields.New(
				"serve-port",
				fields.TypeString,
				fields.WithDefault("8080"),
				fields.WithHelp("HTTP server port"),
			),
			fields.New(
				"timeline-db",
				fields.TypeString,
				fields.WithDefault(""),
				fields.WithHelp("SQLite timeline database path (empty = in-memory)"),
			),
			fields.New(
				"turns-dsn",
				fields.TypeString,
				fields.WithDefault(""),
				fields.WithHelp("SQLite DSN for durable final-turn conversation history; preferred over turns-db"),
			),
			fields.New(
				"turns-db",
				fields.TypeString,
				fields.WithDefault(""),
				fields.WithHelp("SQLite database file for durable final-turn conversation history (empty = in-memory)"),
			),
			fields.New(
				"chunk-delay",
				fields.TypeString,
				fields.WithDefault("20ms"),
				fields.WithHelp("Delay between streaming tokens for mock streaming"),
			),
			fields.New(
				"real-runtime",
				fields.TypeBool,
				fields.WithDefault(false),
				fields.WithHelp("Use Pinocchio/Geppetto runtime instead of deterministic mock engine"),
			),
		),
		cmds.WithSections(commandSettingsSection, profileSettingsSection),
	)

	return &ServeCommand{CommandDescription: desc}, nil
}

func (c *ServeCommand) Run(ctx context.Context, vals *values.Values) error {
	settings := &ServeSettings{}
	if err := vals.DecodeSectionInto(schema.DefaultSlug, settings); err != nil {
		return errors.Wrap(err, "decode serve settings")
	}
	profileSettings := profilebootstrap.ProfileSettings{}
	if err := vals.DecodeSectionInto(profilebootstrap.ProfileSettingsSectionSlug, &profileSettings); err != nil {
		return errors.Wrap(err, "decode profile settings")
	}
	chunkDelay, err := time.ParseDuration(settings.ChunkDelay)
	if err != nil {
		return errors.Wrap(err, "parse chunk-delay")
	}

	opts := webchat.ServerOptions{
		TimelineDB:        settings.TimelineDB,
		TurnsDSN:          settings.TurnsDSN,
		TurnsDB:           settings.TurnsDB,
		ChunkDelay:        chunkDelay,
		UseRealRuntime:    settings.UseRealRuntime,
		Profile:           profileSettings.Profile,
		ProfileRegistries: profileSettings.ProfileRegistries,
		ParsedValues:      vals,
	}

	server, cleanup, err := webchat.NewServer(opts)
	if err != nil {
		return err
	}
	defer func() {
		if err := cleanup(); err != nil {
			log.Error().Err(err).Msg("close chat overlay server")
		}
	}()

	mux := server.Mux()
	httpServer := &http.Server{
		Addr:              ":" + settings.ServePort,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	serverCtx, stop := signal.NotifyContext(ctx, syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		log.Info().Str("addr", httpServer.Addr).Bool("real_runtime", settings.UseRealRuntime).Str("profile", profileSettings.Profile).Msg("starting chat overlay server")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case <-serverCtx.Done():
		log.Info().Msg("shutting down server")
		shutdownBase := context.WithoutCancel(ctx)
		shutdownCtx, cancel := context.WithTimeout(shutdownBase, 10*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(shutdownCtx); err != nil && err != http.ErrServerClosed {
			return err
		}
		return <-errCh
	case err := <-errCh:
		return err
	}
}
