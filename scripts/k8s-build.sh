#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${REGISTRY:-ghcr.io/meeteora}"
TAG="${TAG:-latest}"

echo "Building images for $REGISTRY:$TAG"

docker build -t "$REGISTRY/api:$TAG" -f apps/api/Dockerfile .
docker build -t "$REGISTRY/notifications:$TAG" -f apps/notifications/Dockerfile .
docker build -t "$REGISTRY/scheduling:$TAG" -f apps/scheduling/Dockerfile .
docker build -t "$REGISTRY/web:$TAG" -f apps/web/Dockerfile .

echo "Done. Push with: docker push $REGISTRY/<app>:$TAG"
