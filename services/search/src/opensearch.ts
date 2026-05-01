import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

// OPENSEARCH_ENDPOINT is set by Lambda env (OpenSearch Serverless collection endpoint)
// OPENSEARCH_URL is used locally (http://localhost:9200)
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT ?? process.env.OPENSEARCH_URL ?? 'http://localhost:9200';
const isServerless = OPENSEARCH_ENDPOINT.includes('aoss.amazonaws.com');

let opensearchClient: Client;

if (isServerless) {
  // OpenSearch Serverless — uses AWS SigV4 signing
  opensearchClient = new Client({
    ...AwsSigv4Signer({
      region: process.env.AWS_REGION ?? 'us-east-1',
      service: 'aoss',
      getCredentials: defaultProvider(),
    }),
    node: OPENSEARCH_ENDPOINT,
  });
} else {
  // Local OpenSearch — no auth
  opensearchClient = new Client({ node: OPENSEARCH_ENDPOINT });
}

export { opensearchClient };

export const INDEX_NAME = 'items';

const INDEX_MAPPING = {
  mappings: {
    properties: {
      id: { type: 'keyword' },
      type: { type: 'keyword' },
      title: { type: 'text' },
      description: { type: 'text' },
      category: { type: 'keyword' },
      location: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      date: { type: 'date' },
      status: { type: 'keyword' },
      ownerId: { type: 'keyword' },
    },
  },
};

export async function ensureIndex(): Promise<void> {
  try {
    const exists = await opensearchClient.indices.exists({ index: INDEX_NAME });
    if (!exists.body) {
      await opensearchClient.indices.create({
        index: INDEX_NAME,
        body: INDEX_MAPPING,
      });
      console.log(`Created OpenSearch index: ${INDEX_NAME}`);
    }
  } catch (err) {
    console.warn('Could not ensure OpenSearch index:', err);
  }
}
