terraform {
  required_version = ">= 1.6"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 6.0"
    }
  }
}

# Credentials come from ~/.oci/config (run `oci setup config` once).
provider "oci" {
  region              = var.region
  config_file_profile = var.oci_profile
}
