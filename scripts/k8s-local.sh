#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${REGISTRY:-local}"
TAG="${TAG:-latest}"
NAMESPACE="${NAMESPACE:-meeteora}"

if command -v minikube >/dev/null 2>&1; then
  echo "Using minikube"
  minikube status >/dev/null 2>&1 || minikube start
  eval "$(minikube docker-env)"
  using_minikube=1
elif command -v kind >/dev/null 2>&1; then
  echo "Using kind"
  kind get clusters | grep -q meeteora || kind create cluster --name meeteora
  kind_cluster=meeteora
else
  echo "Install minikube or kind first."
  exit 1
fi

REGISTRY="$REGISTRY" TAG="$TAG" ./scripts/k8s-build.sh

if [ "${kind_cluster:-}" ]; then
  for app in api notifications scheduling web; do
    kind load docker-image "$REGISTRY/$app:$TAG" --name "$kind_cluster"
  done
fi

REGISTRY="$REGISTRY" TAG="$TAG" ./scripts/k8s-deploy.sh

if [ "${using_minikube:-0}" = 1 ]; then
  eval "$(minikube docker-env -u)"
fi

echo "Run: kubectl port-forward -n $NAMESPACE svc/web 3000:3000"
echo "Then open http://localhost:3000"
