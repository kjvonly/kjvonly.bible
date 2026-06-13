###############################################################################

# VARS
NOSTR_SECRET_KEY := $(shell cat ~/.config/nostr/dev.key)


###############################################################################
# KJVOnly
seed-chapters:
	cd zarf/scripts/seed && NOSTR_SECRET_KEY="$(NOSTR_SECRET_KEY)" ./chapters.sh

seed-plans:
	cd zarf/scripts/seed && NOSTR_SECRET_KEY="$(NOSTR_SECRET_KEY)" ./plans.sh

seed-strongs:
	cd zarf/scripts/seed && NOSTR_SECRET_KEY="$(NOSTR_SECRET_KEY)" ./strongs.sh

seed-all: seed-chapters seed-plans seed-strongs

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

# USE Docker Compose at zarf/docker/docker-compose.yml
minio:
	docker run -d \
		--name minio \
		-p 9000:9000 \
		-p 9001:9001 \
		-e MINIO_ROOT_USER=devuser \
		-e MINIO_ROOT_PASSWORD=devpassword \
		-v minio-data:/data \
		minio/minio server /data --console-address ":9001"

# USE Docker Compose at zarf/docker/docker-compose.yml
postgres:
	docker run -d \
		--name postgres \
		-p 5432:5432 \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=blossom \
		-v postgres-data:/var/lib/postgresql/data \
		postgres:17

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