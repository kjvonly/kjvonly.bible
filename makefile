###############################################################################

# VARS
NOSTR_SECRET_KEY := $(shell cat ~/.config/nostr/dev.key)
export NOSTR_SECRET_KEY

###############################################################################
# DOCKER

DOCKER_COMPOSE = docker compose \
	-p kjvonly \
	--env-file zarf/docker/.env.development \
	-f zarf/docker/docker-compose.yml

DOCKER_COMPOSE_TEST = docker compose \
	-p kjvonly-test \
	--env-file zarf/docker/.env.test \
	-f zarf/docker/docker-compose.yml


.PHONY: \
	up \
	down \
	down-clean \
	logs \
	logs-postgres \
	logs-seaweedfs \
	logs-relay \
	logs-blossom \
	psql \
	psql-blossom \
	test-up \
	test-down \
	test-down-clean \
	test-logs \
	test-logs-postgres \
	test-logs-seaweedfs \
	test-logs-relay \
	test-logs-blossom \
	test-psql \
	test-psql-blossom


###############################################################################
## DEFAULT STACK

# Rebuild local images on development startup; Docker still uses its layer cache.
up:
	$(DOCKER_COMPOSE) up -d --build

down:
	$(DOCKER_COMPOSE) down

down-clean:
	$(DOCKER_COMPOSE) down -v

logs:
	$(DOCKER_COMPOSE) logs -f

logs-postgres:
	$(DOCKER_COMPOSE) logs -f postgres

logs-seaweedfs:
	$(DOCKER_COMPOSE) logs -f seaweedfs-master seaweedfs-volume seaweedfs-filer seaweedfs-s3 seaweedfs-init

logs-relay:
	$(DOCKER_COMPOSE) logs -f relay

logs-blossom:
	$(DOCKER_COMPOSE) logs -f blossom

psql:
	$(DOCKER_COMPOSE) exec postgres \
		psql -U postgres -d kjvonly

psql-blossom:
	$(DOCKER_COMPOSE) exec postgres \
		psql -U postgres -d blossom


###############################################################################
## TEST STACK

test-up:
	$(DOCKER_COMPOSE_TEST) up -d --build

test-down:
	$(DOCKER_COMPOSE_TEST) down

test-down-clean:
	$(DOCKER_COMPOSE_TEST) down -v

test-logs:
	$(DOCKER_COMPOSE_TEST) logs -f

test-logs-postgres:
	$(DOCKER_COMPOSE_TEST) logs -f postgres

test-logs-seaweedfs:
	$(DOCKER_COMPOSE_TEST) logs -f seaweedfs-master seaweedfs-volume seaweedfs-filer seaweedfs-s3 seaweedfs-init

test-logs-relay:
	$(DOCKER_COMPOSE_TEST) logs -f relay

test-logs-blossom:
	$(DOCKER_COMPOSE_TEST) logs -f blossom

test-psql:
	$(DOCKER_COMPOSE_TEST) exec postgres \
		psql -U postgres -d kjvonly

test-psql-blossom:
	$(DOCKER_COMPOSE_TEST) exec postgres \
		psql -U postgres -d blossom

###############################################################################

# NOSTR

## NOSTR KEY

.PHONY: nostr-key nostr-pub nostr-load nostr-show

nostr-keygen:
	@mkdir -p ~/.config/nostr
	@test -f ~/.config/nostr/dev.key || nak key generate > ~/.config/nostr/dev.key
	@chmod 600 ~/.config/nostr/dev.key
	@echo "Nostr key saved to ~/.config/nostr/dev.key"

nostr-pub:
	@nak key public $$(cat ~/.config/nostr/dev.key)

nostr-show:
	@cat ~/.config/nostr/dev.key

nostr-load:
	@echo 'export NOSTR_SECRET_KEY=$$(cat ~/.config/nostr/dev.key)'

nostr-nsec:
	@cat ~/.config/nostr/dev.key | xargs nak encode nsec

###############################################################################
# SERVER (one Go module at server/)

.PHONY: server-tidy server-build server-test

server-tidy:
	cd server && GOTOOLCHAIN=auto go mod tidy

server-build: relay-build blossom-build

# Tests both services and the shared PostgreSQL eventstore package.
server-test:
	cd server && GOTOOLCHAIN=auto go test ./...

###############################################################################
# RELAY

.PHONY: relay-build relay-run relay-test relay-docker-build relay-docker-up \
	relay-docker-rebuild relay-logs relay-shell

relay-build:
	mkdir -p server/bin
	cd server && GOTOOLCHAIN=auto go build -o bin/relay ./relay

relay-run:
	cd server && GOTOOLCHAIN=auto go run ./relay

relay-test:
	cd server && GOTOOLCHAIN=auto go test ./relay/...

relay-docker-build:
	$(DOCKER_COMPOSE) build relay

relay-docker-up:
	$(DOCKER_COMPOSE) up -d relay

relay-docker-rebuild:
	$(DOCKER_COMPOSE) up -d --build relay

relay-logs:
	$(DOCKER_COMPOSE) logs -f relay

relay-shell:
	$(DOCKER_COMPOSE) exec relay sh

###############################################################################
# BLOSSOM

.PHONY: blossom-build blossom-run blossom-test blossom-docker-build \
	blossom-docker-up blossom-docker-rebuild blossom-logs blossom-shell

blossom-build:
	mkdir -p server/bin
	cd server && GOTOOLCHAIN=auto go build -o bin/blossom ./blossom

blossom-run:
	cd server && GOTOOLCHAIN=auto go run ./blossom

blossom-test:
	cd server && GOTOOLCHAIN=auto go test ./blossom/...

blossom-docker-build:
	$(DOCKER_COMPOSE) build blossom

blossom-docker-up:
	$(DOCKER_COMPOSE) up -d blossom

blossom-docker-rebuild:
	$(DOCKER_COMPOSE) up -d --build blossom

blossom-logs:
	$(DOCKER_COMPOSE) logs -f blossom

blossom-shell:
	$(DOCKER_COMPOSE) exec blossom sh


###############################################################################
# CLIENT

## NPM
client-install:
	cd $(CLIENT_DIR) && npm install

client-build:
	cd $(CLIENT_DIR) && npm run build

client-dev:
	cd $(CLIENT_DIR) && npm run dev > ../client.log 2>&1 &

client-dev-logs:
	tail -f client.log

client-dev-stop:
	pkill -f "npm run dev"

client-dev-restart: client-dev-stop client-dev

## CERTS

CLIENT_DIR := client
CERT_DIR := $(CLIENT_DIR)/.certs
SSL_DOMAIN := app.test

ssl: ssl-root-ca ssl-app-cert

ssl-root-ca:
	mkdir -p $(CERT_DIR)
	openssl req -x509 -nodes -new -sha256 -days 390 -newkey rsa:2048 \
		-keyout $(CERT_DIR)/RootCA.key \
		-out $(CERT_DIR)/RootCA.pem \
		-subj "/C=US/CN=Local Development CA"
	openssl x509 -outform pem \
		-in $(CERT_DIR)/RootCA.pem \
		-out $(CERT_DIR)/RootCA.crt

ssl-app-ext:
	mkdir -p $(CERT_DIR)
	printf '%s\n' \
		'authorityKeyIdentifier=keyid,issuer' \
		'basicConstraints=CA:FALSE' \
		'keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment' \
		'subjectAltName = @alt_names' \
		'' \
		'[alt_names]' \
		'DNS.1 = $(SSL_DOMAIN)' \
		'DNS.2 = *.$(SSL_DOMAIN)' \
		> $(CERT_DIR)/$(SSL_DOMAIN).ext

ssl-app-cert: ssl-app-ext
	openssl req -new -nodes -newkey rsa:2048 \
		-keyout $(CERT_DIR)/$(SSL_DOMAIN).key \
		-out $(CERT_DIR)/$(SSL_DOMAIN).csr \
		-subj "/C=US/ST=State/L=City/O=Dev/CN=$(SSL_DOMAIN)"
	openssl x509 -req -sha256 -days 390 \
		-in $(CERT_DIR)/$(SSL_DOMAIN).csr \
		-CA $(CERT_DIR)/RootCA.pem \
		-CAkey $(CERT_DIR)/RootCA.key \
		-CAcreateserial \
		-extfile $(CERT_DIR)/$(SSL_DOMAIN).ext \
		-out $(CERT_DIR)/$(SSL_DOMAIN).crt

ssl-trust:
	sudo security add-trusted-cert -d -r trustRoot \
		-k /Library/Keychains/System.keychain \
		$(CERT_DIR)/RootCA.crt

ssl-clean:
	rm -rf $(CERT_DIR)

###############################################################################
# CLIENT

CLI_DIR = client/cli
APP_DATA_MANIFEST = ../../zarf/manifest/app-data-home.yaml
APP_DATA_LOG_DIR := $(CURDIR)/logs/app-data

.PHONY: \
	app-data-build \
	app-data-build-verbose \
	app-data-publish \
	app-data-publish-verbose \
	app-data-sync \
	app-data-sync-verbose

app-data-build:
	cd $(CLI_DIR) && \
		npm run build && \
		node dist/main.js build $(APP_DATA_MANIFEST)

app-data-build-verbose:
	cd $(CLI_DIR) && \
		npm run build && \
		node dist/main.js build -v $(APP_DATA_MANIFEST)

app-data-publish:
	cd $(CLI_DIR) && \
		npm run build && \
		NODE_USE_SYSTEM_CA=1 \
		node dist/main.js publish $(APP_DATA_MANIFEST)

app-data-publish-verbose:
	cd $(CLI_DIR) && \
		npm run build && \
		NODE_USE_SYSTEM_CA=1 \
		node dist/main.js publish -v $(APP_DATA_MANIFEST)


app-data-sync: up
	cd $(CLI_DIR) && \
		npm run build && \
		node dist/main.js sync $(APP_DATA_MANIFEST)


app-data-sync-verbose: up
	@mkdir -p "$(APP_DATA_LOG_DIR)"
	cd $(CLI_DIR) && \
		npm run build && \
		bash -o pipefail -c '\
			TIMESTAMP=$$(date +%Y%m%d-%H%M%S); \
			NODE_USE_SYSTEM_CA=1 \
			node dist/main.js sync -v $(APP_DATA_MANIFEST) 2>&1 \
				| tee "$(APP_DATA_LOG_DIR)/$$TIMESTAMP.raw.log" \
				| node scripts/format-verbose-log.mjs \
				| tee "$(APP_DATA_LOG_DIR)/$$TIMESTAMP.log" \
		'

# =============================================================================
# Filesystem Import Smoke (mixed file types)
# =============================================================================
# This exercises the same recursive import/strategy/staging pipeline as
# app-filesystem, but publishes to a separate local smoke mount.
FILESYSTEM_IMPORT_SMOKE_SOURCE = ../../zarf/manifest/filesystem-import-smoke/source
FILESYSTEM_IMPORT_SMOKE_MANIFEST = ../../zarf/manifest/filesystem-import-smoke.yaml
FILESYSTEM_IMPORT_SMOKE_OUTPUT_MANIFEST = ../../zarf/manifest/filesystem-import-smoke/.publication.generated.json
FILESYSTEM_IMPORT_SMOKE_ROOT = filesystem-import-smoke
FILESYSTEM_IMPORT_SMOKE_LARGE_STUB = zarf/manifest/filesystem-import-smoke/large.nd.json.stub
FILESYSTEM_IMPORT_SMOKE_LARGE = zarf/manifest/filesystem-import-smoke/source/sermons/large.nd.json
FILESYSTEM_IMPORT_SMOKE_BLOCK = zarf/manifest/filesystem-import-smoke/.large-content-block
FILESYSTEM_IMPORT_SMOKE_VERBOSE = $(if $(filter 1,$(VERBOSE)),-v)
FILESYSTEM_IMPORT_SMOKE_INLINE_ARG = $(if $(filter undefined,$(origin INLINE_LIMIT_BYTES)),,--inline-limit-bytes "$(INLINE_LIMIT_BYTES)")

# Keep the generated large source between runs to test incremental reuse.
# Generate a source document just over 1 MiB to exercise Blossom at the
# default threshold, alongside the committed small inline documents.
$(FILESYSTEM_IMPORT_SMOKE_LARGE): $(FILESYSTEM_IMPORT_SMOKE_LARGE_STUB)
	@mkdir -p "$(dir $@)"
	@{ printf '{"type":"word","text":"'; \
		head -c 1048576 /dev/zero | tr '\0' 'A'; \
		printf '"}\n'; } > "$(FILESYSTEM_IMPORT_SMOKE_BLOCK)"
	@sed -e '/^__LARGE_WORD__$$/r $(FILESYSTEM_IMPORT_SMOKE_BLOCK)' \
		-e '/^__LARGE_WORD__$$/d' "$<" > "$@"

.PHONY: filesystem-import-smoke-build filesystem-import-smoke-publish filesystem-import-smoke-sync

filesystem-import-smoke-build: $(FILESYSTEM_IMPORT_SMOKE_LARGE)
	cd $(CLI_DIR) && \
		npm run build && \
		node dist/main.js import filesystem $(FILESYSTEM_IMPORT_SMOKE_VERBOSE) \
			"$(FILESYSTEM_IMPORT_SMOKE_SOURCE)" \
			--manifest "$(FILESYSTEM_IMPORT_SMOKE_MANIFEST)" \
			--root "$(FILESYSTEM_IMPORT_SMOKE_ROOT)" \
			--output-manifest "$(FILESYSTEM_IMPORT_SMOKE_OUTPUT_MANIFEST)" \
			$(FILESYSTEM_IMPORT_SMOKE_INLINE_ARG)

filesystem-import-smoke-publish:
	@test -f "zarf/manifest/filesystem-import-smoke/.publication.generated.json" || { \
		echo 'Run make filesystem-import-smoke-build first.' >&2; exit 1; \
	}
	cd $(CLI_DIR) && \
		NODE_USE_SYSTEM_CA=1 \
		node dist/main.js publish $(FILESYSTEM_IMPORT_SMOKE_VERBOSE) \
			"$(FILESYSTEM_IMPORT_SMOKE_OUTPUT_MANIFEST)"

# Import must succeed before publishing its newly generated Manifest.
filesystem-import-smoke-sync: filesystem-import-smoke-build
	@$(MAKE) filesystem-import-smoke-publish

# =============================================================================
# Application Filesystem (mixed files)
# =============================================================================
# Keep APP_FILESYSTEM_SOURCE as one cumulative local directory. New collections
# can be added under that tree without changing the mounted Filesystem root.
# Source paths are resolved from the repository root, not from client/cli.
APP_FILESYSTEM_SOURCE ?= $(HOME)/git/app-files
APP_FILESYSTEM_SOURCE_ABS = $(abspath $(APP_FILESYSTEM_SOURCE))
# Separate production and localhost publication pointers. Both use the same
# Filesystem Resource identity and mount path, but independent staging.
APP_FILESYSTEM_ENV ?= development
ifeq ($(APP_FILESYSTEM_ENV),development)
APP_FILESYSTEM_MANIFEST = ../../zarf/manifest/app-filesystem-development.yaml
APP_FILESYSTEM_OUTPUT_MANIFEST_REPO = zarf/manifest/app-filesystem/.publication-development.generated.json
else ifeq ($(APP_FILESYSTEM_ENV),production)
APP_FILESYSTEM_MANIFEST = ../../zarf/manifest/app-filesystem.yaml
APP_FILESYSTEM_OUTPUT_MANIFEST_REPO = zarf/manifest/app-filesystem/.publication.generated.json
else
$(error Invalid APP_FILESYSTEM_ENV '$(APP_FILESYSTEM_ENV)'; use development or production)
endif
APP_FILESYSTEM_OUTPUT_MANIFEST = ../../$(APP_FILESYSTEM_OUTPUT_MANIFEST_REPO)
APP_FILESYSTEM_ROOT = app-filesystem
APP_FILESYSTEM_VERBOSE = $(if $(filter 1,$(VERBOSE)),-v)
# Omitted: CLI default 1 MiB. Explicit zero: all nonempty documents use Blossom.
APP_FILESYSTEM_INLINE_LIMIT_ARG = $(if $(filter undefined,$(origin INLINE_LIMIT_BYTES)),,--inline-limit-bytes "$(INLINE_LIMIT_BYTES)")

.PHONY: \
	app-filesystem-build \
	app-filesystem-publish \
	app-filesystem-sync

app-filesystem-build:
	@test -d "$(APP_FILESYSTEM_SOURCE_ABS)" || { \
		printf 'App filesystem source directory not found: %s\n' "$(APP_FILESYSTEM_SOURCE_ABS)" >&2; \
		exit 1; \
	}
	cd $(CLI_DIR) && \
		npm run build && \
		node dist/main.js import filesystem $(APP_FILESYSTEM_VERBOSE) "$(APP_FILESYSTEM_SOURCE_ABS)" \
			--manifest $(APP_FILESYSTEM_MANIFEST) \
			--root $(APP_FILESYSTEM_ROOT) \
			--output-manifest $(APP_FILESYSTEM_OUTPUT_MANIFEST) $(APP_FILESYSTEM_INLINE_LIMIT_ARG)

app-filesystem-publish:
	@test -f "$(APP_FILESYSTEM_OUTPUT_MANIFEST_REPO)" || { \
		echo 'First run make app-filesystem-build APP_FILESYSTEM_ENV=$(APP_FILESYSTEM_ENV) to stage a publication.' >&2; \
		exit 1; \
	}
	cd $(CLI_DIR) && \
		NODE_USE_SYSTEM_CA=1 \
		node dist/main.js publish $(APP_FILESYSTEM_VERBOSE) $(APP_FILESYSTEM_OUTPUT_MANIFEST)

# Build first; never publish a stale generated Manifest after a failed import.
# Reuse the publish recipe rather than running a second copy of the command.
app-filesystem-sync: app-filesystem-build
	@$(MAKE) app-filesystem-publish

###############################################################################
# GIT

.PHONY: \
	push

push:
	git push devbox HEAD

.PHONY: worktree worktree-sync worktree-new worktree-remove-all worktree-watch worktree-watch-stop

worktree-new:
	@test -n "$(BRANCH)" || (echo "Usage: make worktree-new BRANCH=feature/server-deployment" && exit 1)
	@$(MAKE) worktree BRANCH="$(BRANCH)"
	@$(MAKE) worktree-sync BRANCH="$(BRANCH)"

worktree:
	@test -n "$(BRANCH)" || (echo "Usage: make worktree BRANCH=feature/server-deployment" && exit 1)
	@mkdir -p worktrees
	git worktree add "worktrees/$$(basename "$(BRANCH)")" -b "$(BRANCH)" master

worktree-sync:
	@test -n "$(BRANCH)" || (echo "Usage: make worktree-sync BRANCH=feature/server-deployment" && exit 1)
	@WORKTREE="worktrees/$$(basename "$(BRANCH)")"; \
	test -d "$$WORKTREE" || (echo "Worktree does not exist: $$WORKTREE" && exit 1); \
	rsync -av --delete client/node_modules/ "$$WORKTREE/client/pwa/node_modules/"; \
	rsync -a client/pwa/.certs/ "$$WORKTREE/client/pwa/.certs/"

worktree-remove:
	@test -n "$(BRANCH)" || (echo "Usage: make worktree-remove BRANCH=feature/server-deployment" && exit 1)
	@WORKTREE="worktrees/$$(basename "$(BRANCH)")"; \
	git worktree remove "$$WORKTREE"

# make worktree-remove-all SKIP=ops,bug
worktree-remove-all:
	@WORKTREES="$$(git worktree list --porcelain | \
		awk '/^worktree / { print substr($$0, 10) }' | \
		grep '/worktrees/')"; \
	for SKIP in $$(printf '%s' "$(SKIP)" | tr ',' ' '); do \
		WORKTREES="$$(printf '%s\n' "$$WORKTREES" | grep -vF "/worktrees/$$SKIP")"; \
	done; \
	printf '%s\n' "$$WORKTREES" | \
	while IFS= read -r WORKTREE; do \
		[ -n "$$WORKTREE" ] || continue; \
		echo "Removing $$WORKTREE"; \
		git worktree remove "$$WORKTREE"; \
	done
	@git worktree prune

worktree-watch:
	@test -n "$(BRANCH)" || (echo "Usage: make worktree-watch BRANCH=feature/ui-bugs" && exit 1)
	@WORKTREE="$(CURDIR)/worktrees/$$(basename "$(BRANCH)")"; \
	NAME="$$(basename "$(BRANCH)")"; \
	LOG="$$WORKTREE/.watch-copy.log"; \
	PIDFILE="$$WORKTREE/.watch-copy.pid"; \
	nohup watch-copy \
		"$(HOME)/Downloads" \
		"$$WORKTREE/" \
		"*$$NAME*" \
		> "$$LOG" 2>&1 & \
	echo $$! > "$$PIDFILE"; \
	echo "Watcher started for $$NAME"

.PHONY: new-chat-files new-chat-prompt worktrees-backups

new-chat-files:
	@DATE=$$(date +%Y%m%d); \
	ZIP="kjvonly-new-chat-files-$$DATE.zip"; \
	echo "Creating $$ZIP"; \
	zip -r "$$ZIP" \
		client/ \
		docs/ \
		zarf/ \
		makefile \
		-x '*/node_modules/*' \
		   '*/.svelte-kit/*' \
		   '*/.*' \
		   '*/.certs/*'

worktrees-backups:
	@DATE=$$(date +%Y%m%d); \
	ZIP="kjvonly-worktree-backups-$$DATE.zip"; \
	echo "Creating $$ZIP"; \
	zip -r "$$ZIP" \
		worktrees/wt{1,2,3,4}/client \
		worktrees/wt{1,2,3,4}/docs \
		-x '*/node_modules/*' \
		   '*/.svelte-kit/*' \
		   '*/.DS_Store' \
		   '*/.certs/*'

new-chat-prompt:
	@pbcopy < ../kjvonly.bible.prompts/NEW_CHAT_PROMPT.md
	@echo "Copied NEW_CHAT_PROMPT.md to clipboard"
