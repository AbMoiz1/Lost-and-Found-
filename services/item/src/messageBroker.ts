import amqplib from 'amqplib';

let connection: any = null;
let channel: any = null;

// Check if we're running on AWS (SNS) or locally (RabbitMQ)
const useAws = !!process.env.SNS_ITEMS_TOPIC_ARN;

let snsClient: any = null;
let topicArn: string | undefined;

export async function connectMessageBroker(): Promise<void> {
  if (useAws) {
    const { SNSClient } = await import('@aws-sdk/client-sns');
    snsClient = new SNSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
    topicArn = process.env.SNS_ITEMS_TOPIC_ARN;
    console.log('AWS SNS message broker configured, topic:', topicArn);
    return;
  }

  const url = process.env.RABBITMQ_URL ?? 'amqp://localhost';
  connection = await amqplib.connect(url);
  channel = await connection.createChannel();
  await channel.assertExchange('items', 'fanout', { durable: true });
  console.log('RabbitMQ message broker connected');
}

export async function publishEvent(event: Record<string, unknown>): Promise<void> {
  if (useAws) {
    if (!snsClient || !topicArn) {
      console.warn('SNS not configured — skipping event publish');
      return;
    }
    const { PublishCommand } = await import('@aws-sdk/client-sns');
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(event),
    });
    await snsClient.send(command);
    return;
  }

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
