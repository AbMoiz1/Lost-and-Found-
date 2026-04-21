import amqplib from 'amqplib';

let connection: any = null;
let channel: any = null;

export async function connectMessageBroker(): Promise<void> {
  const url = process.env.RABBITMQ_URL ?? 'amqp://localhost';
  connection = await amqplib.connect(url);
  channel = await connection.createChannel();
  await channel.assertExchange('items', 'fanout', { durable: true });
  console.log('Message broker connected');
}

export async function publishEvent(event: Record<string, unknown>): Promise<void> {
  if (!channel) {
    console.warn('Message broker not connected — skipping event publish');
    return;
  }
  channel.publish('items', '', Buffer.from(JSON.stringify(event)), { persistent: true });
}

export async function closeMessageBroker(): Promise<void> {
  await channel?.close();
  await connection?.close();
}
