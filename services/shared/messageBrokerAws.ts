// AWS SNS message broker — replaces RabbitMQ for AWS deployment
// Used by Item Service to publish "item.created" events to SNS items-topic
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const topicArn = process.env.SNS_ITEMS_TOPIC_ARN;

export async function connectMessageBroker(): Promise<void> {
  if (!topicArn) {
    console.warn('SNS_ITEMS_TOPIC_ARN not set — event publishing disabled');
    return;
  }
  console.log('AWS SNS message broker configured, topic:', topicArn);
}

export async function publishEvent(event: Record<string, unknown>): Promise<void> {
  if (!topicArn) {
    console.warn('SNS topic not configured — skipping event publish');
    return;
  }
  const command = new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(event),
  });
  await snsClient.send(command);
}

export async function closeMessageBroker(): Promise<void> {
  // SNS client doesn't need explicit cleanup
}
