import { Client } from '@opensearch-project/opensearch';

const OPENSEARCH_URL = process.env.OPENSEARCH_URL ?? 'http://localhost:9200';

export const opensearchClient = new Client({ node: OPENSEARCH_URL });

const INDEX_NAME = 'items';

const INDEX_MAPPING = {
  mappings: {
    properties: {
      id: { type: 'keyword' },
      type: { type: 'keyword' },
      title: { type: 'text' },
      description: { type: 'text' },
      category: { type: 'keyword' },
      location: {
        type: 'text',
        fields: { keyword: { type: 'keyword' } },
      },
      date: { type: 'date' },
      status: { type: 'keyword' },
      ownerId: { type: 'keyword' },
    },
  },
};

export async function ensureIndex(): Promise<void> {
  const exists = await opensearchClient.indices.exists({ index: INDEX_NAME });
  if (!exists.body) {
    await opensearchClient.indices.create({
      index: INDEX_NAME,
      body: INDEX_MAPPING,
    });
    console.log(`Created OpenSearch index: ${INDEX_NAME}`);
  }
}

export { INDEX_NAME };
