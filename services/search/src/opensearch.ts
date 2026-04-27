import { Client } from '@opensearch-project/opensearch';

const OPENSEARCH_URL = process.env.OPENSEARCH_URL ?? 'http://localhost:9200';

// On AWS, OpenSearch requires authentication. Parse credentials from env.
let clientOptions: any = { node: OPENSEARCH_URL };

const credentialsJson = process.env.OPENSEARCH_CREDENTIALS;
if (credentialsJson) {
  try {
    const creds = JSON.parse(credentialsJson);
    const url = new URL(OPENSEARCH_URL);
    url.username = creds.username;
    url.password = creds.password;
    clientOptions = {
      node: url.toString(),
      ssl: { rejectUnauthorized: false },
    };
  } catch (e) {
    console.warn('Failed to parse OPENSEARCH_CREDENTIALS, using URL as-is');
  }
}

export const opensearchClient = new Client(clientOptions);

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
