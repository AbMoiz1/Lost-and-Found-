import app from './app';
import { runMigrations } from './migrate';
import { connectMessageBroker } from './messageBroker';

const PORT = process.env.PORT ?? 4002;

async function main() {
  await runMigrations();
  await connectMessageBroker();
  app.listen(PORT, () => {
    console.log(`Item service listening on port ${PORT}`);
  });
}

main().catch(err => {
  console.error('Failed to start item service:', err);
  process.exit(1);
});
