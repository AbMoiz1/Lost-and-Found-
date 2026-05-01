import serverlessExpress from '@vendia/serverless-express';
import app from './app';
import { ensureIndex } from './opensearch';

let initialized = false;

const serverless = serverlessExpress({ app });

export const handler = async (event: any, context: any) => {
  if (!initialized) {
    try {
      await ensureIndex();
      initialized = true;
    } catch (err) {
      console.error('OpenSearch index init failed:', err);
    }
  }
  return serverless(event, context);
};
