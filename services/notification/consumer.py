"""
RabbitMQ consumer for the Notification Service.

Listens on the `matches` exchange for `match.created` events.
For each event:
  1. Fetches user contact info from Auth Service via internal HTTP
  2. Sends email via SMTP (MailHog)
  3. Sends SMS if user has SMS enabled
  4. Retries up to 3 times with exponential backoff (1s, 2s, 4s) on failure
"""
import asyncio
import json
import os
from typing import Dict, Any

import aio_pika
import httpx

from notifier import send_notification


RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth:4001")


async def fetch_user_contact_info(user_id: str) -> Dict[str, Any] | None:
    """Fetch user contact information from Auth Service."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{AUTH_SERVICE_URL}/api/auth/users/{user_id}")
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Failed to fetch user {user_id}: {response.status_code}")
                return None
    except Exception as exc:
        print(f"Error fetching user {user_id}: {exc}")
        return None


async def handle_match_created(event: Dict[str, Any]) -> None:
    """Process a single match.created event."""
    if event.get("eventType") != "match.created":
        return

    lost_item_owner_id = event.get("lostItemOwnerId")
    if not lost_item_owner_id:
        print("No lostItemOwnerId in match.created event")
        return

    # Fetch user contact info
    user_info = await fetch_user_contact_info(lost_item_owner_id)
    if not user_info:
        print(f"Could not fetch user info for {lost_item_owner_id}")
        return

    # Prepare notification content
    match_id = event.get("matchId", "")
    found_item_id = event.get("foundItemId", "")
    score = event.get("score", 0.0)
    
    subject = "Potential Match Found for Your Lost Item"
    message = f"""
A potential match has been found for your lost item!

Match ID: {match_id}
Found Item ID: {found_item_id}
Match Score: {score:.2f}

Please check the portal to view the details and contact the finder.
"""

    # Send notification with retry logic
    await send_notification(
        email=user_info.get("email"),
        phone=user_info.get("phone") if user_info.get("sms_enabled") else None,
        subject=subject,
        message=message
    )


async def start_consumer() -> None:
    """Connect to RabbitMQ and start consuming match.created events."""
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            "matches", aio_pika.ExchangeType.FANOUT, durable=True
        )
        queue = await channel.declare_queue("notification-service", durable=True)
        await queue.bind(exchange)

        async def on_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
            async with message.process():
                event = json.loads(message.body.decode())
                await handle_match_created(event)

        await queue.consume(on_message)
        print("Notification consumer started. Waiting for match.created events...")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(start_consumer())