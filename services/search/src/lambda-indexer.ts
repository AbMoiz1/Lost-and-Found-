/**
 * Lambda handler for the Search Indexer.
 *
 * Receives SQS events (batches of item.created/item.updated messages),
 * indexes each item in OpenSearch using the existing indexing logic.
 */
import { SQSEvent } from 'aws-lambda';
import { opensearchClient, INDEX_NAME } from './opensearch';

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

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    try {
      const itemEvent: ItemEvent = JSON.parse(record.body);
      if (itemEvent.eventType === 'item.created' || itemEvent.eventType === 'item.updated') {
        await indexItem(itemEvent);
        console.log(`Indexed item ${itemEvent.itemId} (${itemEvent.eventType})`);
      }
    } catch (err) {
      console.error('Failed to process record:', err);
      throw err; // Let Lambda retry via SQS visibility timeout
    }
  }

  return { statusCode: 200, body: 'OK' };
};
