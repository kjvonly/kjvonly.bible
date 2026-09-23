.PHONY: build build-arm64 build-amd64 build-all build-multi builder \
	run run-arm64 run-amd64 up up-arm64 up-amd64 down down-arm64 down-amd64 \
	restart logs shell ps clean rebuild

IMAGE ?= kjvonly-pwa
ARM64_IMAGE ?= kjvonly-pwa:arm64
AMD64_IMAGE ?= kjvonly-pwa:amd64
CONTAINER ?= kjvonly-pwa
PORT ?= 8080
BASE_PATH ?=
ENV_FILE ?=

ENV_SECRET :=
ifneq ($(strip $(ENV_FILE)),)
ENV_SECRET := --secret=id=build_env,src="$(ENV_FILE)"
endif

BUILDER ?= kjvonly-pwa-builder
PLATFORMS ?= linux/amd64,linux/arm64
PUSH_IMAGE ?=

build:
	docker build $(ENV_SECRET) \
		-f Dockerfile \
		--build-arg BASE_PATH="$(BASE_PATH)" \
		-t "$(IMAGE)" \
		..

builder:
	@if ! docker buildx inspect "$(BUILDER)" >/dev/null 2>&1; then \
		docker buildx create \
			--name "$(BUILDER)" \
			--driver docker-container >/dev/null; \
	fi
	@docker buildx inspect "$(BUILDER)" --bootstrap >/dev/null

build-arm64: builder
	docker buildx build $(ENV_SECRET) \
		--builder "$(BUILDER)" \
		--platform linux/arm64 \
		--load \
		-f Dockerfile \
		--build-arg BASE_PATH="$(BASE_PATH)" \
		-t "$(ARM64_IMAGE)" \
		..

build-amd64: builder
	docker buildx build $(ENV_SECRET) \
		--builder "$(BUILDER)" \
		--platform linux/amd64 \
		--load \
		-f Dockerfile \
		--build-arg BASE_PATH="$(BASE_PATH)" \
		-t "$(AMD64_IMAGE)" \
		..

build-all: build-arm64 build-amd64

build-multi: builder
	@test -n "$(PUSH_IMAGE)" || \
		(echo "Usage: make build-multi PUSH_IMAGE=registry.example/kjvonly-pwa:tag" && exit 1)
	docker buildx build $(ENV_SECRET) \
		--builder "$(BUILDER)" \
		--platform "$(PLATFORMS)" \
		--push \
		-f Dockerfile \
		--build-arg BASE_PATH="$(BASE_PATH)" \
		-t "$(PUSH_IMAGE)" \
		..

run:
	docker run \
		--name "$(CONTAINER)" \
		-p "$(PORT):80" \
		-d \
		"$(IMAGE)"

run-arm64:
	docker run \
		--platform linux/arm64 \
		--name "$(CONTAINER)-arm64" \
		-p "$(PORT):80" \
		-d \
		"$(ARM64_IMAGE)"

run-amd64:
	docker run \
		--platform linux/amd64 \
		--name "$(CONTAINER)-amd64" \
		-p "$(PORT):80" \
		-d \
		"$(AMD64_IMAGE)"

up: build
	@docker rm -f "$(CONTAINER)" 2>/dev/null || true
	$(MAKE) run

up-arm64: build-arm64
	@docker rm -f "$(CONTAINER)-arm64" 2>/dev/null || true
	$(MAKE) run-arm64

up-amd64: build-amd64
	@docker rm -f "$(CONTAINER)-amd64" 2>/dev/null || true
	$(MAKE) run-amd64

down:
	@docker rm -f "$(CONTAINER)" 2>/dev/null || true

down-arm64:
	@docker rm -f "$(CONTAINER)-arm64" 2>/dev/null || true

down-amd64:
	@docker rm -f "$(CONTAINER)-amd64" 2>/dev/null || true

restart: down run

rebuild:
	docker build $(ENV_SECRET) \
		--no-cache \
		-f Dockerfile \
		--build-arg BASE_PATH="$(BASE_PATH)" \
		-t "$(IMAGE)" \
		..

logs:
	docker logs -f "$(CONTAINER)"

shell:
	docker exec -it "$(CONTAINER)" /bin/sh

ps:
	docker ps --filter "name=$(CONTAINER)"

clean: down down-arm64 down-amd64
	@docker image rm "$(IMAGE)" 2>/dev/null || true
	@docker image rm "$(ARM64_IMAGE)" 2>/dev/null || true
	@docker image rm "$(AMD64_IMAGE)" 2>/dev/null || true
