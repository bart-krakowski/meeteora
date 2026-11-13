#!/usr/bin/env bash
# Retry the OKE node pool until Oracle has Always Free Ampere capacity.
#
# "Out of host capacity" is common for A1 shapes; capacity frees up at
# random times, so this re-applies every INTERVAL seconds until it works.
#
#   ./scripts/oke-retry.sh            # every 5 minutes
#   INTERVAL=120 ./scripts/oke-retry.sh
set -uo pipefail

cd "$(dirname "$0")/../infra/oracle"
TF=$(command -v tofu || command -v terraform) || { echo "need tofu or terraform" >&2; exit 1; }
INTERVAL=${INTERVAL:-300}
attempt=0

while true; do
  attempt=$((attempt + 1))
  echo "[$(date '+%H:%M:%S')] attempt $attempt"
  log=$("$TF" apply -auto-approve -no-color -target=oci_containerengine_node_pool.this 2>&1)
  if [[ $? -eq 0 ]]; then
    echo "$log" | tail -3
    echo "Node pool created. Next: oci ce cluster create-kubeconfig ... then ./scripts/k8s-oracle.sh"
    exit 0
  fi
  if ! grep -q "Out of host capacity" <<<"$log"; then
    echo "$log" | grep -E "Error|Message" | head -5
    echo "Failed for a reason other than capacity; stopping." >&2
    exit 1
  fi
  echo "  no capacity, retrying in ${INTERVAL}s"
  sleep "$INTERVAL"
done
