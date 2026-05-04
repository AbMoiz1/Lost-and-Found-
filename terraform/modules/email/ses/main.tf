

# Verify a sender email address (for dev/sandbox mode)
# In production, you'd verify the entire domain instead
resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

# SES configuration set — for tracking bounces and complaints
resource "aws_ses_configuration_set" "main" {
  name = "${var.project}-config-set"
}
