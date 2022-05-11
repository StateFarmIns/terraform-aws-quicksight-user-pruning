variable "prefix" {
  default     = ""
  type        = string
  description = "Prefix prepended to the beginning of all names of created resources"
}

variable "suffix" {
  default     = ""
  type        = string
  description = "Suffix appended to the end of all names of created resources"
}

variable "notify_days" {
  default     = 25
  type        = number
  description = "Days since last access when we should notify users about deletion"
}

variable "delete_days" {
  default     = 30
  type        = number
  description = "Days since last access when we should delete the user"
}

variable "enable_notification" {
  type        = bool
  default     = true
  description = "Whether to enable email notification."
}

variable "tags" {
  type        = map(string)
  default     = null
  description = "Tags to add to resources (set to empty if you are using default_tags in the AWS provider)"
}

variable "contact_email" {
  type        = string
  description = "E-mail address (can be a DL) to include in the HTML email notification. Tells users to contact that e-mail for further questions."
}

variable "reply_to" {
  type        = string
  description = "Reply-to e-mail address. MUST BE *@statefarm.com"
}

variable "cc" {
  type        = list(string)
  description = "CC e-mail addresses. MUST BE *@statefarm.com"
}

variable "vpc_id" {
  default     = null
  type        = string
  description = "VPC ID override. If not entered, the module defaults to picking the first VPC in the account."
}

variable "permissions_boundary_arn" {
  default     = null
  type        = string
  description = "If you need to attach a permissions boundary to a role (e.g. you are in P&C Claims) then give the ARN of the permissions boundary policy here"
}

variable "cron_expression" {
  default     = "cron(6 6 * * ? *)"
  type        = string
  description = "When to trigger the Lambda. See: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html"
}
