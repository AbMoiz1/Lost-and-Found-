"""
RabbitMQ consumer for the Matching Service.

Listens on the `items` exchange for `item.created` events.
For each new item:
  1. Queries opposite-type items from the DB.
  2. Scores all pairs using scorer.score_items().
  3. Persists matches above MATCH_THRESHOLD.
  4. Publishes a `match.created` event for each new match.
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone

import aio_pika
import psycopg2

from db import get_connection
from scorer import score_items

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "0.5"))


def _fetch_item_owner(item_id: str) -> str:
    """Fetch the owner_id of a lost item from the item DB."""
    item_db_url = os.getenv("ITEM_DATABASE_URL")
    if not item_db_url:
        return ""
    item_conn = psycopg2.connect(item_db_url)
    try:
        with item_conn.cursor() as cur:
            cur.execute("SELECT owner_id FROM items WHERE id = %s", (item_id,))
            row = cur.fetchone()
            return str(row[0]) if row else ""
    finally:
        item_conn.close()


def _fetch_opposite_items(conn, item_type: str) -> list[dict]:
    """Return all active items of the opposite type from the item DB."""
    opposite = "found" if item_type == "lost" else "lost"
    item_db_url = os.getenv("ITEM_DATABASE_URL")
    if not item_db_url:
        return []
    item_conn = psycopg2.connect(item_db_url)
    try:
        with item_conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, type, category, location, date
                FROM items
                WHERE type = %s AND status = 'active'
                """,
                (opposite,),
            )
            rows = cur.fetchall()
    finally:
        item_conn.close()
    return [
        {
            "id": str(row[0]),
            "type": row[1],
            "category": row[2],
            "location": row[3],
            "date": row[4].isoformat() if row[4] else None,
        }
        for row in rows
    ]


def _persist_match(conn, lost_id: str, found_id: str, score: float) -> str | None:
    """
    Insert a match record. Returns the new match UUID or None if it already exists.
    """
    with conn.cursor() as cur:
        try:
            cur.execute(
                """
                INSERT INTO matches (lost_item_id, found_item_id, score)
                VALUES (%s, %s, %s)
                ON CONFLICT (lost_item_id, found_item_id) DO NOTHING
                RETURNING id
                """,
                (lost_id, found_id, score),
            )
            row = cur.fetchone()
            conn.commit()
            return str(row[0]) if row else None
        except Exception:
            conn.rollback()
            raise


async def _publish_match_created(
    channel: aio_pika.abc.AbstractChannel,
    match_id: str,
    lost_item_id: str,
    found_item_id: str,
    lost_owner_id: str,
    score: float,
) -> None:
    exchange = await channel.declare_exchange(
        "matches", aio_pika.ExchangeType.FANOUT, durable=True
    )
    event = {
        "eventType": "match.created",
        "matchId": match_id,
        "lostItemId": lost_item_id,
        "foundItemId": found_item_id,
        "lostItemOwnerId": lost_owner_id,
        "score": score,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await exchange.publish(
        aio_pika.Message(body=json.dumps(event).encode()),
        routing_key="",
    )


async def handle_item_created(
    event: dict,
    channel: aio_pika.abc.AbstractChannel,
) -> None:
    """Process a single item.created event."""
    if event.get("eventType") != "item.created":
        return

    item_id = event.get("itemId")
    item_type = event.get("type")  # "lost" or "found"
    owner_id = event.get("ownerId", "")

    new_item = {
        "id": item_id,
        "type": item_type,
        "category": event.get("category", ""),
        "location": event.get("location", ""),
        "date": event.get("date"),
    }

    conn = get_connection()
    try:
        opposite_items = _fetch_opposite_items(conn, item_type)

        for other in opposite_items:
            if item_type == "lost":
                lost_id, found_id = item_id, other["id"]
                lost_owner = owner_id
            else:
                lost_id, found_id = other["id"], item_id
                # fetch the lost item owner from item DB
                lost_owner = _fetch_item_owner(lost_id)

            score = score_items(new_item, other)
            if score < MATCH_THRESHOLD:
                continue

            match_id = _persist_match(conn, lost_id, found_id, score)
            if match_id:
                await _publish_match_created(
                    channel, match_id, lost_id, found_id, lost_owner, score
                )
    finally:
        conn.close()


async def start_consumer() -> None:
    """Connect to RabbitMQ and start consuming item.created events."""
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            "items", aio_pika.ExchangeType.FANOUT, durable=True
        )
        queue = await channel.declare_queue("matching-service", durable=True)
        await queue.bind(exchange)

        async def on_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
            async with message.process():
                event = json.loads(message.body.decode())
                await handle_item_created(event, channel)

        await queue.consume(on_message)
        print("Matching consumer started. Waiting for item.created events...")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(start_consumer())
