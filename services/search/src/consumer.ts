import amqplib from 'amqplib';
import { opensearchClient, INDEX_NAME } from './opensearch';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
const SQS_QUEUE_URL = process.env.SQS_SEARCH_ITEMS_QUEUE_URL;
const EXCHANGE = 'items';
const useAws = !!SQS_QUEUE_URL;

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
  });
}

export async function startConsumer(): Promise<void> {
  if (useAws) {
    const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = await import('@aws-sdk/client-sqs');
    const sqsClient = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
    console.log(`Search SQS consumer polling: ${SQS_QUEUE_URL}`);

    const poll = async () => {
      while (true) {
        try {
          const response = await sqsClient.send(new ReceiveMessageCommand({
            QueueUrl: SQS_QUEUE_URL,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
          }));

          for (const msg of response.Messages ?? []) {
            try {
              const event: ItemEvent = JSON.parse(msg.Body ?? '{}');
              if (event.eventType === 'item.created' || event.eventType === 'item.updated') {
                await indexItem(event);
                console.log(`Indexed item ${event.itemId} (${event.eventType})`);
              }
              await sqsClient.send(new DeleteMessageCommand({
                QueueUrl: SQS_QUEUE_URL,
                ReceiptHandle: msg.ReceiptHandle,
              }));
            } catch (err) {
              console.error('Failed to process SQS message:', err);
            }
          }
        } catch (err) {
          console.error('SQS poll error:', err);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    };
    poll(); // start polling in background (don't await)
    return;
  }

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
