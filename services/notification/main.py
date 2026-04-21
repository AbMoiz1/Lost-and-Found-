"""
Notification Service — FastAPI application entry point.

Stateless service that consumes match.created events from RabbitMQ
and sends email/SMS notifications to users.
"""
import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI


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


app = FastAPI(title="Notification Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}