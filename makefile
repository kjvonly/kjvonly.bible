###############################################################################

# VARS
NOSTR_SECRET_KEY := $(shell cat ~/.config/nostr/dev.key)
export NOSTR_SECRET_KEY

###############################################################################
# SEED 
seed-chapters:
	cd zarf/scripts/seed && \
	./chapters.sh all

seed-chapters-relay:
	cd zarf/scripts/seed && \
	./chapters.sh relay

seed-chapters-blossom:
	cd zarf/scripts/seed && \
	./chapters.sh blossom

seed-kjv:
	cd zarf/scripts/seed && \
	./chapters.sh file ../../../data/json.gz/kjv.json.gz "KJV Bible"

seed-kjvs:
	cd zarf/scripts/seed && \
	./chapters.sh file ../../../data/json.gz/kjvs.json.gz "KJV Bible with Strongs Concordance"

seed-strongs:
	cd zarf/scripts/seed && ./strongs.sh all

seed-strongs-relay:
	cd zarf/scripts/seed && ./strongs.sh relay

seed-strongs-blossom:
	cd zarf/scripts/seed && ./strongs.sh blossom

seed-strongs-all-file:
	cd zarf/scripts/seed && ./strongs.sh file ../../../data/strongs.json.gz/all.json.gz "Strong's Concordance"

seed-chapters:
	cd zarf/scripts/seed && NOSTR_SECRET_KEY="$(NOSTR_SECRET_KEY)" ./chapters.sh

seed-plans:
	cd zarf/scripts/seed && NOSTR_SECRET_KEY="$(NOSTR_SECRET_KEY)" ./plans.sh

###############################################################################

# DOCKER

## Docker Compose
.PHONY: minio postgres up

up:
	docker compose -f zarf/docker/docker-compose.yml up -d

down:
	docker compose -f zarf/docker/docker-compose.yml down

down-clean:
	docker compose -f zarf/docker/docker-compose.yml down -v

logs:
	docker compose -f zarf/docker/docker-compose.yml logs -f

logs-postgres:
	docker compose -f zarf/docker/docker-compose.yml logs -f postgres

logs-minio:
	docker compose -f zarf/docker/docker-compose.yml logs -f minio

psql:
	docker exec -it postgres_db psql -U postgres -d kjvonly

psql-blossom:
	docker exec -it postgres_db psql -U postgres -d blossom

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

##############################################################################
# RELAY

relay-build:
	cd relay && go build -o relay .

relay-run:
	cd relay && go run .

relay-test:
	cd relay && go test ./...

relay-docker-build:
	docker compose -f zarf/docker/docker-compose.yml build relay

relay-docker-up:
	docker compose -f zarf/docker/docker-compose.yml up -d relay

relay-docker-rebuild:
	docker compose -f zarf/docker/docker-compose.yml up -d --build relay

relay-logs:
	docker compose -f zarf/docker/docker-compose.yml logs -f relay

relay-shell:
	docker exec -it relay_server sh

###############################################################################
# BLOSSOM

blossom-build:
	cd blossom && go build -o blossom .

blossom-run:
	cd blossom && go run .

blossom-test:
	cd blossom && go test ./...

blossom-docker-build:
	docker compose -f zarf/docker/docker-compose.yml build blossom

blossom-docker-up:
	docker compose -f zarf/docker/docker-compose.yml up -d blossom

blossom-docker-rebuild:
	docker compose -f zarf/docker/docker-compose.yml up -d --build blossom

blossom-logs:
	docker compose -f zarf/docker/docker-compose.yml logs -f blossom

blossom-shell:
	docker exec -it blossom_server sh