package cmds

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-go-golems/chat-overlay/internal/webchat"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
)

func NewServeCommand() *cobra.Command {
	var (
		servePort  string
		timelineDB string
		chunkDelay time.Duration
	)

	cmd := &cobra.Command{
		Use:   "serve",
		Short: "Start the chat overlay server",
		RunE: func(cmd *cobra.Command, args []string) error {
			opts := webchat.ServerOptions{
				TimelineDB: timelineDB,
				ChunkDelay: chunkDelay,
			}

			server, cleanup, err := webchat.NewServer(opts)
			if err != nil {
				return err
			}
			defer cleanup()

			mux := server.Mux()

			httpServer := &http.Server{
				Addr:    ":" + servePort,
				Handler: mux,
			}

			go func() {
				log.Info().Str("addr", httpServer.Addr).Msg("starting chat overlay server")
				if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					log.Fatal().Err(err).Msg("server failed")
				}
			}()

			quit := make(chan os.Signal, 1)
			signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
			<-quit

			log.Info().Msg("shutting down server")
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			return httpServer.Shutdown(shutdownCtx)
		},
	}

	cmd.Flags().StringVar(&servePort, "serve-port", "8080", "HTTP server port")
	cmd.Flags().StringVar(&timelineDB, "timeline-db", "", "SQLite timeline database path (empty = in-memory)")
	cmd.Flags().DurationVar(&chunkDelay, "chunk-delay", 20*time.Millisecond, "delay between streaming tokens")

	return cmd
}
