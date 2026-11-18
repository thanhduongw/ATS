"""
RabbitMQ connection manager using aio-pika.
Handles connection lifecycle, channel creation, and queue declarations.
"""

import logging
from contextlib import asynccontextmanager

import aio_pika
from aio_pika import ExchangeType

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# --- Queue / Exchange constants (match Java services' RabbitMQConfig) ---
ATS_EXCHANGE = "ats.events"

# AI Service publishes to this routing key; application-service declares and binds its own queue for it.
AI_SCORING_COMPLETED_ROUTING_KEY = "ai.scoring.completed"


class RabbitMQManager:
    """Manages a single RabbitMQ connection for the ai-service lifetime."""

    def __init__(self):
        self._connection: aio_pika.abc.AbstractRobustConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None
        self._exchange: aio_pika.abc.AbstractExchange | None = None

    async def connect(self) -> None:
        """Establish connection, declare exchange and queues."""
        settings = get_settings()
        try:
            self._connection = await aio_pika.connect_robust(settings.rabbitmq_url)
            self._channel = await self._connection.channel()
            await self._channel.set_qos(prefetch_count=5)

            # Declare the shared topic exchange (idempotent — matches Java side)
            self._exchange = await self._channel.declare_exchange(
                ATS_EXCHANGE,
                ExchangeType.TOPIC,
                durable=True,
            )

            # Hàng đợi ai-service nghe (application.created, candidate.data_deleted) do workers/scoring_worker.py khai báo.
            logger.info("RabbitMQ connected. Exchange %s declared.", ATS_EXCHANGE)

        except Exception as e:
            logger.error("Failed to connect to RabbitMQ: %s", e)
            raise

    async def disconnect(self) -> None:
        """Gracefully close the connection."""
        if self._connection and not self._connection.is_closed:
            await self._connection.close()
            logger.info("RabbitMQ connection closed.")

    @property
    def exchange(self) -> aio_pika.abc.AbstractExchange:
        if self._exchange is None:
            raise RuntimeError("RabbitMQ not connected. Call connect() first.")
        return self._exchange

    @property
    def channel(self) -> aio_pika.abc.AbstractChannel:
        if self._channel is None:
            raise RuntimeError("RabbitMQ not connected. Call connect() first.")
        return self._channel

    async def publish(self, routing_key: str, body: bytes) -> None:
        """Publish a message to the ATS exchange."""
        message = aio_pika.Message(
            body=body,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            content_type="application/json",
        )
        await self.exchange.publish(message, routing_key=routing_key)
        logger.debug("Published message to %s", routing_key)


# Singleton instance
rabbitmq_manager = RabbitMQManager()
