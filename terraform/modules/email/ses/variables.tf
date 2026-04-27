variable "project" { type = string }

variable "sender_email" {
  description = "Email address to verify as sender (for SES sandbox mode)"
  type        = string
}
