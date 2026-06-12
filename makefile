up:
	docker compose -f zarf/docker/docker-compose.yml up -d

seedPlans:
	cd zarf/scripts/seed && echo $$NOSTR_SECRET_KEY && ./plans.sh

.PHONY: minio postgres

minio:
	docker run -d \
		--name minio \
		-p 9000:9000 \
		-p 9001:9001 \
		-e MINIO_ROOT_USER=devuser \
		-e MINIO_ROOT_PASSWORD=devpassword \
		-v minio-data:/data \
		minio/minio server /data --console-address ":9001"

postgres:
	docker run -d \
		--name postgres \
		-p 5432:5432 \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=blossom \
		-v postgres-data:/var/lib/postgresql/data \
		postgres:17



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