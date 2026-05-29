package webchat

import (
	"context"
	"fmt"
	"strings"

	"github.com/go-go-golems/chat-overlay/internal/frontendtools"
	geptools "github.com/go-go-golems/geppetto/pkg/inference/tools"
	"github.com/go-go-golems/glazed/pkg/cmds/values"
	"github.com/go-go-golems/pinocchio/pkg/chatapp"
	"github.com/go-go-golems/pinocchio/pkg/cmds/profilebootstrap"
	infruntime "github.com/go-go-golems/pinocchio/pkg/inference/runtime"
	"github.com/go-go-golems/sessionstream/pkg/sessionstream"
	"github.com/rs/zerolog/log"
)

type realRuntimeFactory struct {
	profile           string
	profileRegistries []string
	configFile        string
	parsedValues      *values.Values
	frontendTools     *frontendtools.Manager
}

func newRealRuntimeFactory(opts ServerOptions, frontendTools *frontendtools.Manager) (*realRuntimeFactory, error) {
	profile := strings.TrimSpace(opts.Profile)
	if profile == "" {
		profile = "gpt-5-mini-low"
	}
	return &realRuntimeFactory{
		profile:           profile,
		profileRegistries: append([]string(nil), opts.ProfileRegistries...),
		configFile:        strings.TrimSpace(opts.ConfigFile),
		parsedValues:      opts.ParsedValues,
		frontendTools:     frontendTools,
	}, nil
}

func (f *realRuntimeFactory) promptRequest(ctx context.Context, sid sessionstream.SessionId, prompt string) (chatapp.PromptRequest, error) {
	if f == nil {
		return chatapp.PromptRequest{}, fmt.Errorf("real runtime factory is nil")
	}
	parsed := f.parsedValues
	if parsed == nil {
		var err error
		parsed, err = profilebootstrap.NewCLISelectionValues(profilebootstrap.CLISelectionInput{
			ConfigFile:        f.configFile,
			Profile:           f.profile,
			ProfileRegistries: f.profileRegistries,
		})
		if err != nil {
			return chatapp.PromptRequest{}, fmt.Errorf("create profile selection values: %w", err)
		}
	}
	log.Debug().Str("profile", f.profile).Strs("profile_registries", f.profileRegistries).Str("config_file", f.configFile).Msg("resolving pinocchio profile for chat overlay runtime")
	resolved, err := profilebootstrap.ResolveCLIEngineSettings(ctx, parsed)
	if err != nil {
		return chatapp.PromptRequest{}, fmt.Errorf("resolve pinocchio profile %q: %w", f.profile, err)
	}
	if resolved != nil && resolved.ProfileRuntime != nil {
		log.Info().Str("profile", resolved.ProfileRuntime.ProfileSettings.Profile).Strs("profile_registries", resolved.ProfileRuntime.ProfileSettings.ProfileRegistries).Msg("resolved pinocchio profile for chat overlay runtime")
	}
	defer func() {
		if resolved.Close != nil {
			resolved.Close()
		}
	}()
	engine, err := profilebootstrap.NewEngineFromResolvedCLIEngineSettings(resolved)
	if err != nil {
		return chatapp.PromptRequest{}, fmt.Errorf("build engine from profile %q: %w", f.profile, err)
	}
	log.Debug().Str("profile", f.profile).Msg("built geppetto engine for chat overlay runtime")

	registry := geptools.NewInMemoryToolRegistry()
	if f.frontendTools != nil {
		if err := f.frontendTools.RegisterManifestTools(sid, registry); err != nil {
			return chatapp.PromptRequest{}, fmt.Errorf("register frontend manifest tools: %w", err)
		}
	}
	bridgeExecutor := frontendtools.NewBridgeExecutor(f.frontendTools, nil)

	return chatapp.PromptRequest{
		Prompt: prompt,
		Runtime: &infruntime.ComposedRuntime{
			Engine:       engine,
			Registry:     registry,
			ToolExecutor: bridgeExecutor,
			RuntimeKey:   f.profile,
		},
		RuntimeContext: func(ctx context.Context, sid sessionstream.SessionId, messageID string, pub sessionstream.EventPublisher) context.Context {
			return frontendtools.WithBridgeContext(ctx, frontendtools.BridgeContext{SessionID: sid, MessageID: messageID, Publisher: pub})
		},
	}, nil
}
