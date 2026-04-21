import { S3Client } from '@aws-sdk/client-s3';

const {
  S3_ENDPOINT,
  S3_BUCKET,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION = 'us-east-1',
} = process.env;

export const BUCKET = S3_BUCKET || 'lost-and-found';

export const s3 = new S3Client({
  region: AWS_REGION,
  ...(S3_ENDPOINT
    ? {
        endpoint: S3_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID || 'test',
          secretAccessKey: AWS_SECRET_ACCESS_KEY || 'test',
        },
      }
    : {}),
});
