###############################################################################

# VARS
NOSTR_SECRET_KEY := $(shell cat ~/.config/nostr/dev.key)
export NOSTR_SECRET_KEY

###############################################################################
# SEED 

## CHAPTERS
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

## STRONGS
seed-strongs:
	cd zarf/scripts/seed && ./strongs.sh all

seed-strongs-relay:
	cd zarf/scripts/seed && ./strongs.sh relay

seed-strongs-blossom:
	cd zarf/scripts/seed && ./strongs.sh blossom

seed-strongs-all-file:
	cd zarf/scripts/seed && ./strongs.sh file ../../../data/strongs.json.gz/all.json.gz "Strong's Concordance"

## PLANS
seed-plans-relay:
	cd zarf/scripts/seed && ./plans.sh relay
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

nostr-nsec:
	@cat ~/.config/nostr/dev.key | xargs nak encode nsec

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
SSL_DOMAIN := app.local

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