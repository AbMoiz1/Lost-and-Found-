"""
Matching Service — FastAPI application entry point.
"""
import asyncio
import os

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException

from db import get_connection

MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "0.5"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start RabbitMQ consumer in the background
    try:
        from consumer import start_consumer
        task = asyncio.create_task(start_consumer())
    except Exception as exc:
        print(f"Warning: could not start consumer: {exc}")
        task = None
    yield
    if task:
        task.cancel()


app = FastAPI(title="Matching Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/matching/items/{item_id}/matches")
def get_matches(item_id: str):
    """Return top-5 matches for an item ordered by descending score."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, lost_item_id, found_item_id, score, created_at
                FROM matches
                WHERE lost_item_id = %s OR found_item_id = %s
                ORDER BY score DESC
                LIMIT 5
                """,
                (item_id, item_id),
            )
            rows = cur.fetchall()
            matches = [
                {
                    "id": str(row[0]),
                    "lost_item_id": str(row[1]),
                    "found_item_id": str(row[2]),
                    "score": float(row[3]),
                    "created_at": row[4].isoformat(),
                }
                for row in rows
            ]
            return {"matches": matches}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        conn.close()
