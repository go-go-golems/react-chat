.PHONY: all test build lint lintmax docker-lint golangci-lint-install gosec govulncheck goreleaser tag-major tag-minor tag-patch release bump-go-go-golems install codeql-local geppetto-lint-build geppetto-lint glazed-lint-build glazed-lint web-typecheck web-lint web-check proto-gen proto-gen-core proto-gen-web-chat schema-vet fetch-spa clean-spa build-with-spa logcopter-generate logcopter-check

all: test build

VERSION=v0.1.14
GORELEASER_ARGS ?= --skip=sign --snapshot --clean
GORELEASER_TARGET ?= --single-target
GOLANGCI_LINT_VERSION ?= $(shell cat .golangci-lint-version)
GOLANGCI_LINT_BIN ?= $(CURDIR)/.bin/golangci-lint
SESSIONSTREAM_LINT ?= /tmp/sessionstream-lint
SESSIONSTREAM_LINT_PKG ?= ../sessionstream/cmd/sessionstream-lint

TAPES=$(shell ls doc/vhs/*tape 2>/dev/null || echo "")
gifs:
	for i in $(TAPES); do vhs < $$i; done

# Build geppetto-lint vettool from geppetto module
# Uses the version specified in go.mod
GEPPETTO_LINT_BIN ?= /tmp/geppetto-lint
GEPPETTO_LINT_PKG ?= github.com/go-go-golems/geppetto/cmd/tools/geppetto-lint
GEPPETTO_VERSION ?= $(shell go list -m -f '{{.Version}}' github.com/go-go-golems/geppetto 2>/dev/null)
GLAZED_LINT_BIN ?= /tmp/glazed-lint
GLAZED_LINT_PKG ?= github.com/go-go-golems/glazed/cmd/tools/glazed-lint
GLAZED_VERSION ?= $(shell GOWORK=off go list -m -f '{{.Version}}' github.com/go-go-golems/glazed 2>/dev/null)
GLAZED_LINT_TOOL_VERSION ?= v1.3.5
GLAZED_LINT_FLAGS ?= -glazedclilint.allow-paths=pkg/analysis/,pkg/cli/,pkg/cmds/fields/,pkg/cmds/logging/,pkg/cmds/sources/,pkg/help/,pkg/cmds/cmdlayers/helpers.go,cmd/pinocchio/cmds/clip.go,cmd/pinocchio/cmds/serve.go
GLAZED_LINT_DIRS ?= ./cmd/... ./pkg/...

geppetto-lint-build:
	@echo "Building geppetto-lint from geppetto module..."
	@# In CI, GOFLAGS often includes -mod=readonly; installing without @version can require adding go.sum entries.
	@# Installing with an explicit version avoids modifying the current module's go.{mod,sum}.
	@# In a go.work workspace, go list -m reports "(devel)", so we fall back to workspace install.
	@if [ -n "$(GEPPETTO_VERSION)" ] && [ "$(GEPPETTO_VERSION)" != "(devel)" ]; then \
		echo "Installing $(GEPPETTO_LINT_PKG)@$(GEPPETTO_VERSION)"; \
		GOBIN=$(dir $(GEPPETTO_LINT_BIN)) go install $(GEPPETTO_LINT_PKG)@$(GEPPETTO_VERSION); \
	else \
		echo "Installing $(GEPPETTO_LINT_PKG) from workspace/module"; \
		GOBIN=$(dir $(GEPPETTO_LINT_BIN)) go install $(GEPPETTO_LINT_PKG); \
	fi

geppetto-lint: geppetto-lint-build
	go vet -vettool=$(GEPPETTO_LINT_BIN) ./...

glazed-lint-build:
	@echo "Building glazed-lint from Glazed module..."
	@if [ -n "$(GLAZED_VERSION)" ] && [ "$(GLAZED_VERSION)" != "(devel)" ]; then \
		echo "Installing $(GLAZED_LINT_PKG)@$(GLAZED_VERSION)"; \
		GOBIN=$(dir $(GLAZED_LINT_BIN)) GOWORK=off go install $(GLAZED_LINT_PKG)@$(GLAZED_VERSION) || \
			GOBIN=$(dir $(GLAZED_LINT_BIN)) GOWORK=off go install $(GLAZED_LINT_PKG)@$(GLAZED_LINT_TOOL_VERSION); \
	else \
		echo "Installing $(GLAZED_LINT_PKG)@$(GLAZED_LINT_TOOL_VERSION)"; \
		GOBIN=$(dir $(GLAZED_LINT_BIN)) GOWORK=off go install $(GLAZED_LINT_PKG)@$(GLAZED_LINT_TOOL_VERSION); \
	fi

glazed-lint: glazed-lint-build
	go vet -vettool=$(GLAZED_LINT_BIN) $(GLAZED_LINT_FLAGS) $(GLAZED_LINT_DIRS)

docker-lint:
	docker run --rm -v $(shell pwd):/app -w /app golangci/golangci-lint:$(GOLANGCI_LINT_VERSION) golangci-lint run -v

golangci-lint-install:
	mkdir -p $(dir $(GOLANGCI_LINT_BIN))
	GOBIN=$(dir $(GOLANGCI_LINT_BIN)) go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@$(GOLANGCI_LINT_VERSION)

lint: build geppetto-lint-build glazed-lint-build golangci-lint-install
	$(GOLANGCI_LINT_BIN) run -v
	go vet -vettool=$(GEPPETTO_LINT_BIN) ./...
	go vet -vettool=$(GLAZED_LINT_BIN) $(GLAZED_LINT_FLAGS) $(GLAZED_LINT_DIRS)

lintmax: build geppetto-lint-build glazed-lint-build golangci-lint-install
	$(GOLANGCI_LINT_BIN) run -v --max-same-issues=100
	go vet -vettool=$(GEPPETTO_LINT_BIN) ./...
	go vet -vettool=$(GLAZED_LINT_BIN) $(GLAZED_LINT_FLAGS) $(GLAZED_LINT_DIRS)

gosec:
	go install github.com/securego/gosec/v2/cmd/gosec@latest
	gosec -exclude=G101,G203,G304,G301,G306,G204,G302 -exclude-generated -exclude-dir=.history -exclude-dir=testdata -exclude-dir=pkg/chatapp/pb ./...

govulncheck:
	go install golang.org/x/vuln/cmd/govulncheck@latest
	govulncheck ./...

test:
	go test ./...

build:
	go generate ./...
	go build ./...


proto-gen-core:
	buf generate --template buf.chatapp.gen.yaml --path proto/pinocchio
	buf generate --template buf.chatapp.web.gen.yaml --path proto/pinocchio

proto-gen: proto-gen-core

schema-vet:
	go build -o $(SESSIONSTREAM_LINT) $(SESSIONSTREAM_LINT_PKG)
	go vet -vettool=$(SESSIONSTREAM_LINT) ./cmd/... ./pkg/...

logcopter-generate:
	go generate ./...

logcopter-check:
	go tool logcopter-gen -area-prefix go-go-golems.pinocchio -strip-prefix github.com/go-go-golems/pinocchio -check ./pkg/... ./cmd/...

goreleaser:
	goreleaser release $(GORELEASER_ARGS) $(GORELEASER_TARGET)

tag-major:
	git tag $(shell svu major)

tag-minor:
	git tag $(shell svu minor)

tag-patch:
	git tag $(shell svu patch)

release:
	git push origin --tags
	GOPROXY=proxy.golang.org go list -m github.com/go-go-golems/react-chat@$(shell svu current)

bump-go-go-golems:
	@deps="$$(awk '/^require[[:space:]]+github\.com\/go-go-golems\// { print $$2 } /^[[:space:]]*github\.com\/go-go-golems\// { print $$1 }' go.mod | sort -u)"; \
	if [ -z "$$deps" ]; then \
		echo "No github.com/go-go-golems dependencies in go.mod"; \
	else \
		echo "Bumping go-go-golems dependencies:"; \
		echo "$$deps"; \
		for dep in $$deps; do go get "$${dep}@latest"; done; \
	fi
	go mod tidy

# Path to CodeQL CLI - adjust based on installation location
CODEQL_PATH ?= $(shell which codeql)
# Path to CodeQL queries - adjust based on where you cloned the repository
CODEQL_QUERIES ?= $(HOME)/codeql-go/ql/src/go

# Create CodeQL database and run analysis
codeql-local:
	@if [ -z "$(CODEQL_PATH)" ]; then echo "CodeQL CLI not found. Install from https://github.com/github/codeql-cli-binaries/releases"; exit 1; fi
	@if [ ! -d "$(CODEQL_QUERIES)" ]; then echo "CodeQL queries not found. Clone from https://github.com/github/codeql-go"; exit 1; fi
	$(CODEQL_PATH) database create --language=go --source-root=. ./codeql-db
	$(CODEQL_PATH) database analyze ./codeql-db $(CODEQL_QUERIES)/Security --format=sarif-latest --output=codeql-results.sarif
	@echo "Results saved to codeql-results.sarif"

