import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

async function startServer() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`[Server] BuildLedger Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`[Server] API available at http://localhost:${env.PORT}/api`);
    console.log(`[Server] Allowed Client URL: ${env.CLIENT_URL}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal Error]', err);
  process.exit(1);
});
