SHELL := /bin/sh

COMPOSE ?= docker compose
COMPOSE_FILE ?= docker-compose.prod.yml
ENV_FILE ?= .env
WEB_ENV_FILE ?= web.env

.PHONY: help check config build deploy up restart down down-clean logs ps

help:
	@printf '%s\n' \
		'make check    Validate .env and the production Compose configuration' \
		'make config   Render the resolved production Compose configuration' \
		'make build    Build application images' \
		'make deploy   Validate, build, and deploy the production stack' \
		'make up       Validate and start the production stack' \
		'make restart  Recreate the production stack using the current configuration' \
		'make down     Stop and remove the production stack' \
		'make down-clean Stop and remove the production stack and volumes' \
		'make logs     Follow production stack logs' \
		'make ps       Show production stack status'

check:
	@test -f "$(ENV_FILE)" || \
		(echo "Missing $(ENV_FILE). Create the production environment file first." && exit 1)
	@test -f "$(WEB_ENV_FILE)" || \
		(echo "Missing $(WEB_ENV_FILE). Copy web.env.example to web.env and configure the PWA build." && exit 1)
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" config >/dev/null
	@echo "production deployment configuration OK"

config:
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" config

build: check
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" build

deploy: check
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" build
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" up -d --remove-orphans
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" ps

up: check
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" up -d

restart: check
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" up -d --force-recreate

down:
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" down

down-clean:
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" down -v

logs:
	@$(COMPOSE) --env-file "$(ENV_FILE)" -f "$(COMPOSE_FILE)" logs -f
