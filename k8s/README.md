# Meeteora — Kubernetes manifests

Generic manifests live in `base/`; cloud-specific variants in `overlays/`.

## What changed from Docker Compose

- Each app becomes a Deployment + Service.
- `postgres` and `rabbitmq` become StatefulSets with PVCs.
- Database migrations run as a one-off `Job` (`k8s/base/migrate.yaml`).
- Environment values move to a ConfigMap; secrets move to a Secret.
- Ingress routes everything to web; the browser never calls the backend services directly.

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
- `.github/workflows/deploy.yml` — build, push to GHCR, and deploy to the cluster configured by the `K8S_*` secrets.

Deploy authenticates as the namespaced `ci-deployer` ServiceAccount (`k8s/rbac/ci-deployer.yaml`), not as a cluster admin.

One-time setup, run by a cluster admin:

```bash
kubectl apply -f k8s/rbac/ci-deployer.yaml
kubectl get secret ci-deployer-token -n meeteora -o jsonpath='{.data.token}' | base64 -d
kubectl get secret ci-deployer-token -n meeteora -o jsonpath='{.data.ca\.crt}'
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
```

Store them as secrets of the `production` GitHub environment:

- `K8S_TOKEN` — token printed by the first command.
- `K8S_CA_CERT` — base64 CA printed by the second command (already base64).
- `K8S_SERVER` — API server URL; must be reachable from GitHub runners.

Rotate by deleting `ci-deployer-token`, re-applying the manifest, and updating `K8S_TOKEN`. On EKS, GKE, or AKS prefer OIDC federation over a static token.

## Oracle Cloud (Always Free)

`infra/oracle` (OpenTofu/Terraform) and `overlays/oracle` run everything at $0 on the Always Free tier:

| Resource | Free allowance | Used |
| --- | --- | --- |
| OKE Basic cluster | control plane free | 1 |
| Ampere A1 compute | 4 OCPU, 24 GB | 2 nodes × 2 OCPU / 12 GB |
| Block storage | 200 GB | 2 × 50 GB boot + Postgres 50 GB + RabbitMQ 50 GB |
| Flexible load balancer | 1 × 10 Mbps | Traefik ingress |

Nodes are arm64, so `deploy.yml` builds `linux/arm64` images on GitHub's arm runners.

Tips: upgrade the account to Pay As You Go. It stays free within these limits, but Always Free-only
accounts often hit "Out of host capacity" for Ampere and can have idle instances reclaimed.
Create the cluster in your home region, the only one with Always Free Ampere capacity.

1. Install `oci`, `tofu` (or `terraform`), `kubectl` and `helm`; run `oci setup config`.
2. Create the cluster (about 15 minutes):

   ```bash
   cd infra/oracle
   cp terraform.tfvars.example terraform.tfvars   # region, compartment (tenancy OCID)
   tofu init && tofu apply
   eval "$(tofu output -raw kubeconfig_command)"
   ```

3. Push to `main` once so `deploy.yml` publishes arm64 images. Its deploy job fails until step 5.
   If the GHCR packages are private, make them public or pass `GHCR_USER`/`GHCR_TOKEN` (a `read:packages` PAT) to the next step.
4. Set `DOMAIN`, `ORIGIN` and `ACME_EMAIL` in `overlays/oracle/settings.env`, then run `./scripts/k8s-oracle.sh`.
   It installs Traefik and cert-manager, prints the load balancer IP (point the domain's A record at it; with no
   domain use `<ip>.sslip.io`), generates `meeteora-secrets`, applies the overlay and prints the CI values.
   Optional `GOOGLE_*`/`APPLE_*` env vars go into the secret on its first creation; later, edit the secret.
5. Save `K8S_SERVER`, `K8S_CA_CERT` and `K8S_TOKEN` in the `production` environment and re-run the deploy workflow.

Re-running the script is safe; it never regenerates existing secrets. It resets images to `:latest`, so prefer CI for app rollouts.
Tear down with `tofu destroy` after deleting the `traefik` Service and the PVCs, which OCI created outside Terraform.

## Notes

- The Postgres and RabbitMQ StatefulSets are suitable for local or small clusters. For production, prefer managed services (e.g., Cloud SQL, Amazon MQ, RabbitMQ Cluster Operator).
- `imagePullPolicy: Always` is set for the app images. Pin tags and remove `Always` for reproducible deployments.
- The migration Job uses the `scheduling` image and overrides the command to run only migrations.
- The `docker-compose.yml` uses `postgres:18-alpine`. Verify this tag exists in your registry; the latest stable Postgres release at the time of writing is 17.
