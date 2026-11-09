# Meeteora — Kubernetes manifests

Generic manifests to run the meeteora monorepo on Kubernetes.

## What changed from Docker Compose

- Each app becomes a Deployment + Service.
- `postgres` and `rabbitmq` become StatefulSets with PVCs.
- Database migrations run as a one-off `Job` (`k8s/base/migrate.yaml`).
- Environment values move to a ConfigMap; secrets move to a Secret.
- Ingress routes `/api` to the API service and `/` to the web frontend.

## Build and push images

The Dockerfiles expect the monorepo root as build context.

```bash
./scripts/k8s-build.sh
```

Set registry/tag:

```bash
REGISTRY=ghcr.io/myorg TAG=v1.0.0 ./scripts/k8s-build.sh
```

## Deploy

1. Replace placeholder secrets in `k8s/base/secrets.yaml`.
2. Update `WEB_ORIGIN` and the Ingress host in `k8s/base/configmap.yaml` / `k8s/base/ingress.yaml`.
3. Apply:

```bash
./scripts/k8s-deploy.sh
```

Override registry/tag:

```bash
REGISTRY=ghcr.io/myorg TAG=v1.0.0 ./scripts/k8s-deploy.sh
```

## Local cluster

If you have minikube or kind installed:

```bash
./scripts/k8s-local.sh
```

This creates the cluster, builds images, loads them, deploys, and prints the port-forward command.

## CI/CD

- `.github/workflows/ci.yml` — lint, test, and build images on PRs and `main`.
- `.github/workflows/deploy.yml` — build, push to GHCR, and deploy to the cluster configured in the `KUBECONFIG` secret.

Configure these repository secrets for deploy:

- `KUBECONFIG` — base64-encoded kubeconfig.

## Notes

- The Postgres and RabbitMQ StatefulSets are suitable for local or small clusters. For production, prefer managed services (e.g., Cloud SQL, Amazon MQ, RabbitMQ Cluster Operator).
- `imagePullPolicy: Always` is set for the app images. Pin tags and remove `Always` for reproducible deployments.
- The migration Job uses the `scheduling` image and overrides the command to run only migrations.
- The `docker-compose.yml` uses `postgres:18-alpine`. Verify this tag exists in your registry; the latest stable Postgres release at the time of writing is 17.
