terraform {
  required_version = ">= 0.15"
  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.2.0"
    }

    aws = {
      source  = "hashicorp/aws"
      version = ">= 3.56.0"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_iam_account_alias" "current" {}

data "aws_kms_key" "master" {
  key_id = "alias/${data.aws_iam_account_alias.current.account_alias}-${data.aws_region.current.name}-master-kmskey"
}

# Stolen from https://sfgitlab.opr.statefarm.org/terraform-modules/terraform-aws-apigw-azure-authorizer/-/blob/master/lambda/inputs.tf
data "aws_vpcs" "vpcs" {
  filter {
    name   = "state"
    values = ["available"]
  }
  filter {
    name   = "isDefault"
    values = ["false"]
  }
}

data "aws_subnet_ids" "subnets" {
  vpc_id = local.vpc_id
  tags = {
    network = "private"
    tier    = "app"
  }
}

data "aws_security_group" "base" {
  name   = "base-sg"
  vpc_id = local.vpc_id
}

locals {
  // https://stackoverflow.com/a/58193941
  environment = length(regexall(".*-test.*", data.aws_iam_account_alias.current.account_alias)) > 0 ? "test" : "prod"
  name        = "${var.prefix}quicksight-user-cleanup${var.suffix}"
  vpc_id      = var.vpc_id == null ? sort(data.aws_vpcs.vpcs.ids)[0] : var.vpc_id
}
