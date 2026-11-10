output "cluster_id" {
  value = oci_containerengine_cluster.this.id
}

output "kubernetes_version" {
  value = local.kubernetes_version
}

output "api_endpoint" {
  description = "Value for the K8S_SERVER GitHub secret."
  value       = "https://${oci_containerengine_cluster.this.endpoints[0].public_endpoint}"
}

output "kubeconfig_command" {
  value = "oci ce cluster create-kubeconfig --cluster-id ${oci_containerengine_cluster.this.id} --region ${var.region} --profile ${var.oci_profile} --file $HOME/.kube/config --token-version 2.0.0 --kube-endpoint PUBLIC_ENDPOINT"
}
