variable "region" {
  description = "Home region of the tenancy (Always Free Ampere capacity exists only there), e.g. eu-frankfurt-1."
  type        = string
}

variable "oci_profile" {
  description = "Profile in ~/.oci/config."
  type        = string
  default     = "DEFAULT"
}

variable "compartment_ocid" {
  description = "Compartment for all resources. The tenancy OCID works for a personal account."
  type        = string
}

variable "name" {
  description = "Prefix for resource names."
  type        = string
  default     = "meeteora"
}

variable "kubernetes_version" {
  description = "OKE version such as v1.34.1. Defaults to the newest one OKE offers."
  type        = string
  default     = null
}

variable "node_count" {
  type    = number
  default = 2
}

variable "node_ocpus" {
  description = "OCPUs per node. Always Free covers 4 Ampere OCPUs in total."
  type        = number
  default     = 2
}

variable "node_memory_gbs" {
  description = "Memory per node. Always Free covers 24 GB of Ampere memory in total."
  type        = number
  default     = 12
}

variable "node_boot_volume_gbs" {
  description = "Boot volume per node (minimum 50). Always Free covers 200 GB of block storage in total, PVCs included."
  type        = number
  default     = 50
}

variable "api_allowed_cidrs" {
  description = "CIDRs allowed to reach the Kubernetes API. GitHub-hosted runners need it, hence open by default; auth is still required."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ssh_public_key" {
  description = "Optional SSH key for the worker nodes (reachable only from inside the VCN)."
  type        = string
  default     = null
}
