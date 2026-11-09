#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-meeteora}"
REGISTRY="${REGISTRY:-ghcr.io/meeteora}"
TAG="${TAG:-latest}"

apply_manifests() {
  kubectl kustomize k8s | sed "s|ghcr.io/meeteora/|$REGISTRY/|g; s|:latest|:$TAG|g" | kubectl apply -f -
}

echo "Applying manifests to namespace $NAMESPACE (images: $REGISTRY/*:$TAG)"
kubectl delete job meeteora-migrate -n "$NAMESPACE" --ignore-not-found
apply_manifests

echo "Waiting for Postgres and RabbitMQ to be ready"
kubectl rollout status statefulset/postgres -n "$NAMESPACE" --timeout=120s
kubectl rollout status statefulset/rabbitmq -n "$NAMESPACE" --timeout=120s

echo "Waiting for database migrations"
kubectl wait --for=condition=complete job/meeteora-migrate -n "$NAMESPACE" --timeout=120s

echo "Rolling out apps"
kubectl rollout status deployment/api -n "$NAMESPACE" --timeout=120s
kubectl rollout status deployment/notifications -n "$NAMESPACE" --timeout=120s
kubectl rollout status deployment/scheduling -n "$NAMESPACE" --timeout=120s
kubectl rollout status deployment/web -n "$NAMESPACE" --timeout=120s

echo "Deployment complete"
