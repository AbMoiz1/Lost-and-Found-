import amqplib from 'amqplib';
import { opensearchClient, INDEX_NAME } from './opensearch';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
const EXCHANGE = 'items';

interface ItemEvent {
  eventType: 'item.created' | 'item.updated';
  itemId: string;
  type: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  status?: string;
  ownerId: string;
  timestamp: string;
}

async function indexItem(event: ItemEvent): Promise<void> {
  const doc = {
    id: event.itemId,
    type: event.type,
    title: event.title,
    description: event.description,
    category: event.category,
    location: event.location,
    date: event.date,
    status: event.status ?? 'active',
    ownerId: event.ownerId,
  };

  await opensearchClient.index({
    index: INDEX_NAME,
    id: event.itemId,
    body: doc,
    refresh: true,
  });
}

export async function startConsumer(): Promise<void> {
  const connection = await amqplib.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });

  const { queue } = await channel.assertQueue('search-service', { durable: true });
  await channel.bindQueue(queue, EXCHANGE, '');

  console.log(`Search consumer listening on exchange: ${EXCHANGE}`);

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const event: ItemEvent = JSON.parse(msg.content.toString());

      if (event.eventType === 'item.created' || event.eventType === 'item.updated') {
        await indexItem(event);
        console.log(`Indexed item ${event.itemId} (${event.eventType})`);
      }

      channel.ack(msg);
    } catch (err) {
      console.error('Failed to process message:', err);
      channel.nack(msg, false, false);
    }
  });
}
