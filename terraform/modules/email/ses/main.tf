# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — SES Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: MailHog on port 1025 (SMTP) and 8025 (web UI).
# MailHog captures emails without sending them. SES sends REAL emails.
#
# SA EXAM NOTE:
#   - SES starts in sandbox mode: can only send to verified addresses
#   - Request production access to send to anyone
#   - Domain verification via DNS (TXT record) proves you own the domain
#   - DKIM signing (CNAME records) improves deliverability
#   - For dev, we verify a single email address instead of a domain
# ─────────────────────────────────────────────────────────────────────────────

# Verify a sender email address (for dev/sandbox mode)
# In production, you'd verify the entire domain instead
resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

# SES configuration set — for tracking bounces and complaints
resource "aws_ses_configuration_set" "main" {
  name = "${var.project}-config-set"
}
