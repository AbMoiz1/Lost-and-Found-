"""
MessageBroker abstract base class for publishing and subscribing to events.
Local implementation uses RabbitMQ via aio-pika.
AWS deployment: swap in an SQS adapter without changing service code.
"""
from abc import ABC, abstractmethod
from typing import Any, Callable, Awaitable
import json
import asyncio

import aio_pika


class MessageBroker(ABC):
    @abstractmethod
    async def publish(self, exchange: str, event: dict[str, Any]) -> None:
        """Publish an event to the given exchange."""
        ...

    @abstractmethod
    async def subscribe(
        self,
        exchange: str,
        handler: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        """Subscribe to events on the given exchange."""
        ...


class RabbitMQBroker(MessageBroker):
    def __init__(self, url: str) -> None:
        self._url = url
        self._connection: aio_pika.abc.AbstractConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None

    async def _get_channel(self) -> aio_pika.abc.AbstractChannel:
        if self._connection is None or self._connection.is_closed:
            self._connection = await aio_pika.connect_robust(self._url)
        if self._channel is None or self._channel.is_closed:
            self._channel = await self._connection.channel()
        return self._channel

    async def publish(self, exchange: str, event: dict[str, Any]) -> None:
        channel = await self._get_channel()
        exch = await channel.declare_exchange(exchange, aio_pika.ExchangeType.FANOUT, durable=True)
        await exch.publish(
            aio_pika.Message(body=json.dumps(event).encode()),
            routing_key="",
        )

    async def subscribe(
        self,
        exchange: str,
        handler: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        channel = await self._get_channel()
        exch = await channel.declare_exchange(exchange, aio_pika.ExchangeType.FANOUT, durable=True)
        queue = await channel.declare_queue("", exclusive=True)
        await queue.bind(exch)

        async def _on_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
            async with message.process():
                event = json.loads(message.body.decode())
                await handler(event)

        await queue.consume(_on_message)

    async def close(self) -> None:
        if self._channel:
            await self._channel.close()
        if self._connection:
            await self._connection.close()
