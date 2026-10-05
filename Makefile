SHELL := /bin/sh

.DEFAULT_GOAL := help
.PHONY: help banner install backend mobile clean fclean re \
        backend-setup backend-start backend-stop backend-reset backend-test \
        mobile-start mobile-stop mobile-reset \
        env-sync doc ensure-env
.SILENT:

BACKEND_DIR := backend
MOBILE_DIR := mobile
PROJECT_NAME := music-room
MOBILE_APP_ID := com.example.music_room
ENV_FILE := .env

define run
	tmp_file=$$(mktemp); \
	label="$(1)"; \
	printf "  [....] %s" "$$label"; \
	( $(2) ) > "$$tmp_file" 2>&1 & \
	pid=$$!; \
	spin='-\|/'; \
	i=0; \
	while kill -0 $$pid 2>/dev/null; do \
		i=$$(( (i + 1) % 4 )); \
		char=$$(printf "%s" "$$spin" | cut -c $$((i + 1))); \
		printf "\r  [%s] %s" "$$char" "$$label"; \
		sleep 0.12; \
	done; \
	if wait $$pid; then \
		printf "\r  [ OK ] %s\n" "$$label"; \
		rm -f "$$tmp_file"; \
	else \
		status=$$?; \
		printf "\r  [FAIL] %s\n\n" "$$label"; \
		cat "$$tmp_file"; \
		rm -f "$$tmp_file"; \
		exit $$status; \
	fi
endef

# ---------------------------------------------------------------------------
# Top-level targets
# ---------------------------------------------------------------------------

help: banner
	printf "\n"
	printf "  make install            Install all dependencies (backend + mobile)\n"
	printf "  make backend            Install, start Supabase, then run the API\n"
	printf "  make mobile             Build the mobile app (debug APK)\n"
	printf "  make clean              Remove build artifacts (keeps dependencies)\n"
	printf "  make fclean             Remove everything (deps, builds, Docker assets)\n"
	printf "  make re                 Full clean then reinstall and start backend\n"
	printf "\n"
	printf "  make backend start      Start Supabase and the API without installing\n"
	printf "  make backend stop       Stop the API process and Supabase\n"
	printf "  make backend reset      Reset Supabase, then run the API\n"
	printf "  make backend test       Run the database tests (pgTAP)\n"
	printf "\n"
	printf "  make mobile start       Install and launch on a connected device/emulator\n"
	printf "  make mobile stop        Stop the app on the device\n"
	printf "  make mobile reset       Clean, rebuild, and launch on device\n"
	printf "\n"
	printf "  make env sync           Sync .env into Supabase and Bruno configs\n"
	printf "  make doc                Open the API documentation (Swagger UI)\n"
	printf "\n"

banner:
	printf "\n"
	printf "  __  __           _        ____                       \n"
	printf " |  \\/  |_   _ ___(_) ___  |  _ \\ ___   ___  _ __ ___  \n"
	printf " | |\\/| | | | / __| |/ __| | |_) / _ \\ / _ \\| '_ \` _ \\ \n"
	printf " | |  | | |_| \\__ \\ | (__  |  _ < (_) | (_) | | | | | |\n"
	printf " |_|  |_|\\__,_|___/_|\\___| |_| \\_\\___/ \\___/|_| |_| |_|\n"
	printf "\n"

install: ensure-env
	$(call run,Installing backend dependencies,cd "$(BACKEND_DIR)" && pnpm install)
	$(call run,Downloading mobile dependencies,cd "$(MOBILE_DIR)" && ./gradlew dependencies --quiet)

backend: banner

backend-setup: ensure-env
	$(call run,Installing backend dependencies,cd "$(BACKEND_DIR)" && pnpm install)
	$(call run,Syncing local config,cd "$(BACKEND_DIR)" && pnpm sync-local-config)
	$(call run,Starting local Supabase,cd "$(BACKEND_DIR)" && pnpm db:start)
	printf "\n  [ API ] Starting Fastify in this terminal\n\n"
	cd "$(BACKEND_DIR)" && pnpm dev

backend-start: ensure-env
	$(call run,Syncing local config,cd "$(BACKEND_DIR)" && pnpm sync-local-config)
	$(call run,Starting local Supabase,cd "$(BACKEND_DIR)" && pnpm db:start)
	printf "\n  [ API ] Starting Fastify in this terminal\n\n"
	cd "$(BACKEND_DIR)" && pnpm dev

backend-stop:
	$(call run,Stopping API process on API_PORT,sh "$(BACKEND_DIR)/scripts/stop-api.sh")
	$(call run,Stopping local Supabase,cd "$(BACKEND_DIR)" && pnpm db:stop || true)

backend-reset: ensure-env
	$(MAKE) --no-print-directory backend-stop
	$(call run,Installing backend dependencies,cd "$(BACKEND_DIR)" && pnpm install)
	$(call run,Syncing local config,cd "$(BACKEND_DIR)" && pnpm sync-local-config)
	$(call run,Starting local Supabase,cd "$(BACKEND_DIR)" && pnpm db:start)
	$(call run,Resetting local Supabase database,cd "$(BACKEND_DIR)" && pnpm exec supabase db reset)
	printf "\n  [ API ] Starting Fastify in this terminal\n\n"
	cd "$(BACKEND_DIR)" && pnpm dev

backend-test: ensure-env
	$(call run,Syncing local config,cd "$(BACKEND_DIR)" && pnpm sync-local-config)
	$(call run,Starting local Supabase,cd "$(BACKEND_DIR)" && pnpm db:start)
	printf "\n  [ TEST ] Running database tests\n\n"
	cd "$(BACKEND_DIR)" && pnpm db:test


setup: backend-setup
start: backend-start
stop: backend-stop
reset: backend-reset
test: backend-test

mobile: banner

mobile-build:
	$(call run,Building mobile debug APK,cd "$(MOBILE_DIR)" && ./gradlew assembleDebug)

mobile-start:
	$(call run,Building and installing on device,cd "$(MOBILE_DIR)" && ./gradlew installDebug)
	printf "\n  [ APP ] Launching on device\n\n"
	adb shell am start -n "$(MOBILE_APP_ID)/.MainActivity"

mobile-stop:
	$(call run,Stopping app on device,adb shell am force-stop "$(MOBILE_APP_ID)")

mobile-reset:
	$(call run,Cleaning mobile build,cd "$(MOBILE_DIR)" && ./gradlew clean)
	$(call run,Rebuilding and installing on device,cd "$(MOBILE_DIR)" && ./gradlew installDebug)
	printf "\n  [ APP ] Launching on device\n\n"
	adb shell am start -n "$(MOBILE_APP_ID)/.MainActivity"

env: banner

env-sync: ensure-env
	$(call run,Syncing local config,cd "$(BACKEND_DIR)" && pnpm sync-local-config)

doc:
	printf "  [ DOC ] Opening Swagger UI at http://localhost:%s/docs\n\n" "$$(grep -m1 '^API_PORT=' "$(ENV_FILE)" 2>/dev/null | cut -d= -f2 || echo 3000)"
	open "http://localhost:$$(grep -m1 '^API_PORT=' "$(ENV_FILE)" 2>/dev/null | cut -d= -f2 || echo 3000)/docs"

clean:
	$(call run,Removing backend build artifacts,rm -rf "$(BACKEND_DIR)/dist" "$(BACKEND_DIR)/.turbo")
	$(call run,Cleaning mobile build,cd "$(MOBILE_DIR)" && ./gradlew clean)

fclean:
	$(call run,Stopping backend services,$(MAKE) --no-print-directory backend-stop)
	$(call run,Removing Supabase containers,docker rm -f $$(docker ps -aq --filter "name=$(PROJECT_NAME)") 2>/dev/null || true)
	$(call run,Removing Supabase volumes,docker volume rm $$(docker volume ls -q --filter "name=$(PROJECT_NAME)") 2>/dev/null || true)
	$(call run,Removing Supabase images,docker rmi -f $$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | awk '/supabase/ {print $$2}' | sort -u) 2>/dev/null || true)
	$(call run,Removing backend install and build artifacts,rm -rf "$(BACKEND_DIR)/node_modules" "$(BACKEND_DIR)/dist" "$(BACKEND_DIR)/.turbo")
	$(call run,Cleaning mobile build,cd "$(MOBILE_DIR)" && ./gradlew clean)
	$(call run,Removing Gradle caches,rm -rf "$(MOBILE_DIR)/.gradle" "$(MOBILE_DIR)/app/build")

re: fclean
	$(MAKE) --no-print-directory install
	$(MAKE) --no-print-directory backend-setup

ensure-env:
	if [ ! -f "$(ENV_FILE)" ]; then \
		printf "  [ ENV ] Creating .env with local defaults\n"; \
		{ \
			printf "%s\n" "API_HOST=0.0.0.0"; \
			printf "%s\n" "API_PORT=3000"; \
			printf "%s\n" ""; \
			printf "%s\n" "SUPABASE_API_PORT=54321"; \
			printf "%s\n" "SUPABASE_DB_PORT=54322"; \
			printf "%s\n" "SUPABASE_DB_SHADOW_PORT=54320"; \
			printf "%s\n" "SUPABASE_DB_POOLER_PORT=54329"; \
			printf "%s\n" "SUPABASE_STUDIO_PORT=54333"; \
			printf "%s\n" "SUPABASE_INBUCKET_PORT=54324"; \
			printf "%s\n" "SUPABASE_ANALYTICS_PORT=54327"; \
			printf "%s\n" ""; \
			printf "%s\n" "POSTGRES_HOST=127.0.0.1"; \
			printf "%s\n" "POSTGRES_PORT=54322"; \
			printf "%s\n" "POSTGRES_DB=postgres"; \
			printf "%s\n" "POSTGRES_USER=postgres"; \
			printf "%s\n" "POSTGRES_PASSWORD=postgres"; \
			printf "%s\n" "DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres"; \
		} > "$(ENV_FILE)"; \
	fi
