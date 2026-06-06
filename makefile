up:
	docker compose -f zarf/docker/docker-compose.yml up -d

seedPlans:
	cd zarf/scripts/seed && echo $$NOSTR_SECRET_KEY && ./plans.sh

