/**
 * MessageBroker interface for publishing and subscribing to events.
 * Local implementation uses RabbitMQ.
 * AWS deployment: swap in an SQS adapter without changing service code.
 */
export interface MessageBroker {
  publish(exchange: string, event: Record<string, unknown>): Promise<void>;
  subscribe(exchange: string, handler: (event: Record<string, unknown>) => Promise<void>): Promise<void>;
}

import amqplib from 'amqplib';

export class RabbitMQBroker implements MessageBroker {
  private connection: any = null;
  private channel: any = null;
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  private async getChannel(): Promise<any> {
    if (!this.channel) {
      this.connection = await amqplib.connect(this.url);
      this.channel = await this.connection.createChannel();
    }
    return this.channel;
  }

  async publish(exchange: string, event: Record<string, unknown>): Promise<void> {
    const ch = await this.getChannel();
    await ch.assertExchange(exchange, 'fanout', { durable: true });
    ch.publish(exchange, '', Buffer.from(JSON.stringify(event)));
  }

  async subscribe(
    exchange: string,
    handler: (event: Record<string, unknown>) => Promise<void>
  ): Promise<void> {
    const ch = await this.getChannel();
    await ch.assertExchange(exchange, 'fanout', { durable: true });
    const q = await ch.assertQueue('', { exclusive: true });
    await ch.bindQueue(q.queue, exchange, '');
    ch.consume(q.queue, async (msg: any) => {
      if (!msg) return;
      const event = JSON.parse(msg.content.toString()) as Record<string, unknown>;
      await handler(event);
      ch.ack(msg);
    });
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
