#!/usr/bin/env bash
# One-time (and re-runnable) setup of meeteora on an OKE cluster created by
# infra/oracle. Expects kubectl to point at that cluster.
#
# Optional env:
#   GHCR_USER / GHCR_TOKEN  pull credentials if the GHCR packages are private
#   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / APPLE_CLIENT_ID / APPLE_CLIENT_SECRET
#                           social sign-in; read only when the secret is first created
set -euo pipefail

NAMESPACE=meeteora
OVERLAY=k8s/overlays/oracle

for tool in kubectl helm openssl; do
  command -v "$tool" >/dev/null || { echo "$tool is required"; exit 1; }
done

if grep -q 'example\.com' "$OVERLAY/settings.env"; then
  echo "Set DOMAIN, ORIGIN and ACME_EMAIL in $OVERLAY/settings.env first."
  echo "No domain yet? Run this script once to get the load balancer IP, then use <ip>.sslip.io."
  placeholder_settings=1
fi

kubectl get nodes >/dev/null

echo "Installing Traefik (ingress, behind the free 10 Mbps OCI load balancer)"
helm repo add traefik https://traefik.github.io/charts --force-update >/dev/null
helm upgrade --install traefik traefik/traefik \
  --namespace traefik --create-namespace \
  --values "$OVERLAY/traefik-values.yaml" --wait

echo "Installing cert-manager (Let's Encrypt certificates)"
helm upgrade --install cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true --wait

lb_ip=""
for _ in $(seq 1 60); do
  lb_ip=$(kubectl get svc traefik -n traefik -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
  [ -n "$lb_ip" ] && break
  sleep 5
done
echo "Load balancer IP: ${lb_ip:-<pending>}"

if [ "${placeholder_settings:-0}" = 1 ]; then
  echo "Point your domain at ${lb_ip:-the load balancer IP} (or use ${lb_ip:-<ip>}.sslip.io), update settings.env and re-run."
  exit 1
fi

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Generated once. Never overwritten: Postgres keeps the password it was initialised with.
if ! kubectl get secret meeteora-secrets -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "Creating meeteora-secrets with generated passwords"
  kubectl create secret generic meeteora-secrets -n "$NAMESPACE" \
    --from-literal=POSTGRES_USER=meeteora \
    --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 24)" \
    --from-literal=RABBITMQ_USER=meeteora \
    --from-literal=RABBITMQ_PASSWORD="$(openssl rand -hex 24)" \
    --from-literal=BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
    --from-literal=GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}" \
    --from-literal=GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}" \
    --from-literal=APPLE_CLIENT_ID="${APPLE_CLIENT_ID:-}" \
    --from-literal=APPLE_CLIENT_SECRET="${APPLE_CLIENT_SECRET:-}"
fi

if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "Configuring GHCR pull credentials"
  kubectl create secret docker-registry ghcr-pull -n "$NAMESPACE" \
    --docker-server=ghcr.io --docker-username="${GHCR_USER:?set GHCR_USER}" --docker-password="$GHCR_TOKEN" \
    --dry-run=client -o yaml | kubectl apply -f -
  kubectl patch serviceaccount default -n "$NAMESPACE" \
    -p '{"imagePullSecrets":[{"name":"ghcr-pull"}]}'
fi

echo "Applying manifests"
kubectl delete job meeteora-migrate -n "$NAMESPACE" --ignore-not-found
kubectl apply -k "$OVERLAY"
kubectl apply -f k8s/rbac/ci-deployer.yaml

echo "Waiting for rollout"
kubectl rollout status statefulset/postgres statefulset/rabbitmq -n "$NAMESPACE" --timeout=300s
kubectl wait --for=condition=complete job/meeteora-migrate -n "$NAMESPACE" --timeout=300s
kubectl rollout status deployment/api deployment/auth deployment/notifications \
  deployment/scheduling deployment/web -n "$NAMESPACE" --timeout=300s

origin=$(grep '^ORIGIN=' "$OVERLAY/settings.env" | cut -d= -f2-)
cat <<EOF

Deployed: $origin (certificate issuance can take a minute)

GitHub → Settings → Environments → production → secrets:
  K8S_SERVER   $(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
  K8S_CA_CERT  kubectl get secret ci-deployer-token -n $NAMESPACE -o jsonpath='{.data.ca\.crt}'
  K8S_TOKEN    kubectl get secret ci-deployer-token -n $NAMESPACE -o jsonpath='{.data.token}' | base64 -d
EOF
