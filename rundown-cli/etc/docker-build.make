
MAKEFILE    = etc/docker-build.make
DOCKER_FILE = etc/docker-build.txt

IMAGE_VERSION = `sed -n '/"version":/ s/.*: *"\(.*\)".*/\1/p' ../package.json`
IMAGE_RELEASE = `date '+%Y%m%d'`

DOCKER_IMAGE_CONFIG = \
    IMAGE_VERSION="$(IMAGE_VERSION)" \
    IMAGE_RELEASE="$(IMAGE_RELEASE)"

include etc/docker-build.lib.make

up:
	docker compose -f etc/docker-compose.yaml up -d
down:
	docker compose -f etc/docker-compose.yaml down

