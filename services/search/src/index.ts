import app from './app';
import { ensureIndex } from './opensearch';
import { startConsumer } from './consumer';

const PORT = process.env.PORT ?? 4003;

async function main() {
  try {
    await ensureIndex();
    console.log('OpenSearch index ready');
  } catch (err) {
    console.error('Failed to ensure OpenSearch index:', err);
  }

  try {
    await startConsumer();
    console.log('RabbitMQ consumer started');
  } catch (err) {
    console.error('Failed to start RabbitMQ consumer:', err);
  }

  app.listen(PORT, () => {
    console.log(`Search service listening on port ${PORT}`);
  });
}

main();
