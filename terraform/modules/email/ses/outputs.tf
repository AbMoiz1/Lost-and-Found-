output "sender_email" {
  value = aws_ses_email_identity.sender.email
}

output "ses_smtp_endpoint" {
  description = "SES SMTP endpoint for the region"
  value       = "email-smtp.${data.aws_region.current.name}.amazonaws.com"
}

data "aws_region" "current" {}
