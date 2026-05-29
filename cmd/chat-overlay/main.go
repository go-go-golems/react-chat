package main

import (
	"github.com/go-go-golems/chat-overlay/cmd/chat-overlay/cmds"
	"github.com/go-go-golems/glazed/pkg/cli"
	"github.com/go-go-golems/glazed/pkg/cmds/logging"
	"github.com/go-go-golems/glazed/pkg/cmds/schema"
	"github.com/go-go-golems/glazed/pkg/help"
	help_cmd "github.com/go-go-golems/glazed/pkg/help/cmd"
	"github.com/spf13/cobra"
)

const appName = "chat-overlay"
const profileAppName = "pinocchio"

func main() {
	rootCmd := &cobra.Command{
		Use:           appName,
		Short:         "Chat overlay server with typed widget streaming",
		SilenceUsage:  true,
		SilenceErrors: true,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			return logging.InitLoggerFromCobra(cmd)
		},
	}

	if err := logging.AddLoggingSectionToRootCommand(rootCmd, appName); err != nil {
		cobra.CheckErr(err)
	}

	helpSystem := help.NewHelpSystem()
	help_cmd.SetupCobraRootCommand(helpSystem, rootCmd)

	serveCmd, err := cmds.NewServeCommand()
	cobra.CheckErr(err)
	cobraServeCmd, err := cli.BuildCobraCommandFromCommand(
		serveCmd,
		cli.WithParserConfig(cli.CobraParserConfig{
			// Use Pinocchio's app/config prefix for profile loading so the overlay
			// can consume the same ~/.config/pinocchio/profiles.yaml and profile
			// registry environment conventions as pinocchio cmd/web-chat.
			AppName: profileAppName,
		}),
		cli.WithCobraShortHelpSections(
			schema.DefaultSlug,
		),
	)
	cobra.CheckErr(err)
	rootCmd.AddCommand(cobraServeCmd)

	cobra.CheckErr(rootCmd.Execute())
}
