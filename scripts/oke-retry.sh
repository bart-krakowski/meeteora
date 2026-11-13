#!/usr/bin/env bash
# Create the OKE node pool as soon as Oracle has Ampere (A1) capacity.
#
# "Out of host capacity" is common for A1 shapes and frees up at random
# times, often briefly. This asks Oracle's capacity report every INTERVAL
# seconds (cheap, creates nothing) and runs the apply only when an
# availability domain reports room for one node.
#
#   ./scripts/oke-retry.sh              # check every 60 s
#   INTERVAL=30 ./scripts/oke-retry.sh
set -uo pipefail

cd "$(dirname "$0")/../infra/oracle"
TF=$(command -v tofu || command -v terraform) || { echo "need tofu or terraform" >&2; exit 1; }
INTERVAL=${INTERVAL:-60}

tfvar() { grep -E "^$1\s*=" terraform.tfvars 2>/dev/null | head -1 | cut -d= -f2 | tr -d ' "'; }
COMPARTMENT=$(tfvar compartment_ocid)
OCPUS=$(tfvar node_ocpus); OCPUS=${OCPUS:-2}
MEMORY=$(tfvar node_memory_gbs); MEMORY=${MEMORY:-12}
SHAPE="[{\"instanceShape\":\"VM.Standard.A1.Flex\",\"instanceShapeConfig\":{\"ocpus\":$OCPUS,\"memoryInGbs\":$MEMORY}}]"
ADS=$(oci iam availability-domain list -c "$COMPARTMENT" --query 'data[].name' --raw-output 2>/dev/null | tr -d '[]", ')

has_capacity() {
  local ad status
  for ad in $ADS; do
    status=$(oci compute compute-capacity-report create --compartment-id "$COMPARTMENT" \
      --availability-domain "$ad" --shape-availabilities "$SHAPE" \
      --query 'data."shape-availabilities"[0]."availability-status"' --raw-output 2>/dev/null)
    if [[ "$status" == "AVAILABLE" ]]; then echo "$ad"; return 0; fi
  done
  return 1
}

checks=0
echo "Watching A1 capacity (${OCPUS} OCPU / ${MEMORY} GB) in: $ADS"
while true; do
  checks=$((checks + 1))
  if ad=$(has_capacity); then
    echo "[$(date '+%H:%M:%S')] capacity in $ad, applying"
    log=$("$TF" apply -auto-approve -no-color -target=oci_containerengine_node_pool.this 2>&1)
    if [[ $? -eq 0 ]]; then
      echo "Node pool created. Next: oci ce cluster create-kubeconfig ... then ./scripts/k8s-oracle.sh"
      exit 0
    fi
    if ! grep -q "Out of host capacity" <<<"$log"; then
      echo "$log" | grep -E "Error|Message" | head -5
      echo "Failed for a reason other than capacity; stopping." >&2
      exit 1
    fi
    echo "  capacity was gone by the time the node launched; watching again"
  elif (( checks % 30 == 1 )); then
    echo "[$(date '+%H:%M:%S')] no capacity yet (check $checks)"
  fi
  sleep "$INTERVAL"
done
