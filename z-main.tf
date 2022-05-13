terraform {
  required_version = ">= 0.15"
  required_providers {
    archive = {
      source = "hashicorp/archive"
    }

    aws = {
      source = "hashicorp/aws"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_iam_account_alias" "current" {}

locals {
  name = "${var.prefix}quicksight-user-cleanup${var.suffix}"
}
