import app from './app';
import { runMigrations } from './migrate';

const PORT = Number(process.env.PORT ?? 4001);

async function main() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`Auth service listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start auth service:', err);
  process.exit(1);
});
