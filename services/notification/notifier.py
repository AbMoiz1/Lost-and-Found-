"""
Email and SMS notification logic with retry mechanism.

Implements exponential backoff retry (1s, 2s, 4s) for failed deliveries.
"""
import asyncio
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

import aiosmtplib


SMTP_HOST = os.getenv("SMTP_HOST", "mailhog")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@lostandfound.local")


async def send_email(to_email: str, subject: str, message: str) -> None:
    """Send an email via SMTP."""
    msg = MIMEMultipart()
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(message, "plain"))

    await aiosmtplib.send(
        msg,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USERNAME if SMTP_USERNAME else None,
        password=SMTP_PASSWORD if SMTP_PASSWORD else None,
        use_tls=False,  # MailHog doesn't use TLS
    )


async def send_sms(phone: str, message: str) -> None:
    """Send an SMS. Stub implementation for local development."""
    # In production, this would integrate with a real SMS provider
    print(f"SMS to {phone}: {message}")


async def send_notification_with_retry(
    email: Optional[str] = None,
    phone: Optional[str] = None,
    subject: str = "",
    message: str = "",
    max_retries: int = 3
) -> None:
    """
    Send notification with exponential backoff retry.
    Retries up to max_retries times with delays: 1s, 2s, 4s.
    """
    for attempt in range(max_retries):
        try:
            # Send email if provided
            if email:
                await send_email(email, subject, message)
                print(f"Email sent to {email}")

            # Send SMS if provided
            if phone:
                await send_sms(phone, f"{subject}\n\n{message}")
                print(f"SMS sent to {phone}")

            # If we get here, both notifications succeeded
            return

        except Exception as exc:
            print(f"Notification attempt {attempt + 1} failed: {exc}")
            
            if attempt < max_retries - 1:  # Don't sleep after the last attempt
                delay = 2 ** attempt  # 1s, 2s, 4s
                print(f"Retrying in {delay} seconds...")
                await asyncio.sleep(delay)
            else:
                print(f"All {max_retries} notification attempts failed")
                raise


# Alias for backward compatibility
send_notification = send_notification_with_retry