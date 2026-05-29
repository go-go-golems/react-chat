package main

import (
	"github.com/go-go-golems/chat-overlay/cmd/chat-overlay/cmds"
	"github.com/spf13/cobra"
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "chat-overlay",
		Short: "Chat overlay server with typed widget streaming",
	}

	rootCmd.AddCommand(cmds.NewServeCommand())

	if err := rootCmd.Execute(); err != nil {
		panic(err)
	}
}
