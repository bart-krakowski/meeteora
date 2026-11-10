data "oci_identity_availability_domains" "this" {
  compartment_id = var.compartment_ocid
}

data "oci_containerengine_cluster_option" "this" {
  cluster_option_id = "all"
}

locals {
  kubernetes_version = coalesce(
    var.kubernetes_version,
    reverse(sort(data.oci_containerengine_cluster_option.this.kubernetes_versions))[0],
  )

  # Block storage: node boot volumes + the 50 GB Postgres and RabbitMQ PVCs.
  pvc_gbs = 100
}

# BASIC_CLUSTER: the control plane is free; ENHANCED_CLUSTER is billed per hour.
resource "oci_containerengine_cluster" "this" {
  compartment_id     = var.compartment_ocid
  kubernetes_version = local.kubernetes_version
  name               = var.name
  vcn_id             = oci_core_vcn.this.id
  type               = "BASIC_CLUSTER"

  cluster_pod_network_options {
    cni_type = "FLANNEL_OVERLAY"
  }

  endpoint_config {
    is_public_ip_enabled = true
    subnet_id            = oci_core_subnet.api.id
  }

  options {
    service_lb_subnet_ids = [oci_core_subnet.lb.id]

    kubernetes_network_config {
      pods_cidr     = "10.244.0.0/16"
      services_cidr = "10.96.0.0/16"
    }
  }
}

data "oci_containerengine_node_pool_option" "this" {
  node_pool_option_id = oci_containerengine_cluster.this.id
}

locals {
  # Newest OKE-ready Oracle Linux image for ARM matching the cluster version.
  node_image_id = [
    for source in data.oci_containerengine_node_pool_option.this.sources : source.image_id
    if strcontains(source.source_name, "aarch64")
    && strcontains(source.source_name, "OKE-${trimprefix(local.kubernetes_version, "v")}")
    && !strcontains(source.source_name, "GPU")
  ][0]
}

resource "oci_containerengine_node_pool" "this" {
  cluster_id         = oci_containerengine_cluster.this.id
  compartment_id     = var.compartment_ocid
  kubernetes_version = local.kubernetes_version
  name               = "${var.name}-arm"
  node_shape         = "VM.Standard.A1.Flex"
  ssh_public_key     = var.ssh_public_key

  node_shape_config {
    ocpus         = var.node_ocpus
    memory_in_gbs = var.node_memory_gbs
  }

  node_source_details {
    source_type             = "IMAGE"
    image_id                = local.node_image_id
    boot_volume_size_in_gbs = var.node_boot_volume_gbs
  }

  node_config_details {
    size = var.node_count

    # Every AD is listed so OKE can place nodes wherever Ampere capacity exists.
    dynamic "placement_configs" {
      for_each = data.oci_identity_availability_domains.this.availability_domains
      content {
        availability_domain = placement_configs.value.name
        subnet_id           = oci_core_subnet.nodes.id
      }
    }
  }

  lifecycle {
    precondition {
      condition     = var.node_count * var.node_ocpus <= 4 && var.node_count * var.node_memory_gbs <= 24
      error_message = "Exceeds the Always Free Ampere allowance (4 OCPUs, 24 GB memory in total)."
    }
    precondition {
      condition     = var.node_count * var.node_boot_volume_gbs + local.pvc_gbs <= 200
      error_message = "Boot volumes plus the 100 GB of PVCs exceed the Always Free 200 GB of block storage."
    }
  }
}
