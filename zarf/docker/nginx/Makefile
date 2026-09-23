SHELL := /bin/sh

COMPOSE ?= docker compose
COMPOSE_FILE ?= docker-compose.yml
ENV_FILE ?= .env

.PHONY: help check config pull deploy up restart down logs ps

help:
	@printf '%s\n' \
		'make check    Validate .env, Compose config, and certificate files' \
		'make config   Render the resolved Compose configuration' \
		'make pull     Pull the nginx image' \
		'make deploy   Validate, pull, and deploy nginx' \
		'make up       Validate and start nginx' \
		'make restart  Recreate nginx using the current configuration' \
		'make down     Stop and remove the nginx container' \
		'make logs     Follow nginx logs' \
		'make ps       Show nginx container status'

check:
	@test -f "$(ENV_FILE)" || \
		(echo "Missing $(ENV_FILE). Copy .env.example to .env and configure it." && exit 1)
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" config >/dev/null
	@cert_name=$$(sed -n 's/^CERT_NAME=//p' "$(ENV_FILE)" | tail -n 1); \
		if [ -z "$$cert_name" ]; then cert_name=kjvonly.home; fi; \
		test -f "certs/$$cert_name.crt" || \
			(echo "Missing certs/$$cert_name.crt" && exit 1); \
		test -f "certs/$$cert_name.key" || \
			(echo "Missing certs/$$cert_name.key" && exit 1)
	@echo "nginx deployment configuration OK"

config:
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" config

pull:
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" pull

deploy: check pull
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" up -d --remove-orphans
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" ps

up: check
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" up -d

restart: check
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" up -d --force-recreate

down:
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" down

logs:
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" logs -f nginx

ps:
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" ps
