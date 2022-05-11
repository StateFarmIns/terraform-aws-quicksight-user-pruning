locals {
  // https://techguide.opr.statefarm.org/index.php/AWS_Simple_Email_Service_(SES)#PCAT_Managed_SES
  ses_arns = {
    test = {
      us-east-1 = "arn:aws:ses:us-east-1:761602949203:identity/test.ic1.statefarm",
      us-west-2 = "arn:aws:ses:us-west-2:761602949203:identity/test.ic1.statefarm"
    },
    prod = {
      us-east-1 = "arn:aws:ses:us-east-1:726697055042:identity/ic1.statefarm",
      us-west-2 = "arn:aws:ses:us-west-2:726697055042:identity/ic1.statefarm"
    }
  }

  from = {
    test = "no-reply@test.ic1.statefarm",
    prod = "no-reply@ic1.statefarm"
  }

  prune_quicksight_users_name = "pruneQuickSightUsers"
  lambda_name                 = local.name
}

data "archive_file" "quicksight_cleanup" {
  type        = "zip"
  source_file = "${path.module}/${local.prune_quicksight_users_name}.js"
  output_path = "${path.module}/${local.prune_quicksight_users_name}.zip"
}

resource "aws_lambda_function" "quicksight_cleanup" {
  function_name    = local.lambda_name
  filename         = data.archive_file.quicksight_cleanup.output_path
  source_code_hash = data.archive_file.quicksight_cleanup.output_base64sha256
  runtime          = "nodejs14.x"
  handler          = "${local.prune_quicksight_users_name}.default"
  role             = aws_iam_role.quicksight_cleanup.arn
  timeout          = 900
  memory_size      = 512 # Probably too big, but I want to keep it bigger in case someone's account is massive
  kms_key_arn      = data.aws_kms_key.master.arn
  architectures    = ["arm64"] # Cost savings

  vpc_config {
    security_group_ids = [data.aws_security_group.base.id]
    subnet_ids         = data.aws_subnet_ids.subnets.ids
  }

  environment {
    variables = {
      awsAccountId       = data.aws_caller_identity.current.account_id
      accountAlias       = data.aws_iam_account_alias.current.account_alias
      deleteDays         = var.delete_days
      notifyDays         = var.notify_days
      enableNotification = var.enable_notification
      contact            = var.contact_email
      replyTo            = var.reply_to
      cc                 = jsonencode(var.cc)
      from               = local.from[local.environment]
      sesArn             = local.ses_arns[local.environment][data.aws_region.current.name]
    }
  }

  tags = var.tags
}

resource "aws_iam_role" "quicksight_cleanup" {
  name                 = local.name
  assume_role_policy   = data.aws_iam_policy_document.lambda_assume.json
  permissions_boundary = var.permissions_boundary_arn

  inline_policy {
    name   = local.name
    policy = data.aws_iam_policy_document.quicksight_cleanup.json
  }

  tags = var.tags
}

data "aws_iam_policy_document" "quicksight_cleanup" {
  statement {
    actions   = ["logs:*"]
    resources = ["arn:aws:logs:*:*:*"]
  }

  statement {
    actions   = ["ec2:CreateNetworkInterface", "ec2:DeleteNetworkInterface", "ec2:DescribeNetworkInterfaces"]
    resources = ["*"]
  }

  statement {
    actions   = ["CloudTrail:LookupEvents"]
    resources = ["*"]
  }

  statement {
    actions   = ["quicksight:ListUsers", "quicksight:DeleteUser"]
    resources = ["*"]
  }

  statement {
    actions   = ["ses:SendEmail"]
    resources = [local.ses_arns[local.environment][data.aws_region.current.name]]
  }

  statement {
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "cloudwatch:namespace"
      values   = [local.lambda_name]
    }
  }
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
