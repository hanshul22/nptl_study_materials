import { createApp } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { config } from './config/index.js';
import { createShutdown } from './shutdown.js';

try {
  await connectDb(config.MONGODB_URI);
} catch (err) {
  // DbConnectionError carries only the driver error name, never the URI.
  console.error(err instanceof Error ? err.message : 'MongoDB connection failed');
  process.exit(1);
}
console.log('MongoDB connected');

const server = createApp(config).listen(config.PORT, () => {
  console.log(`API listening on port ${config.PORT}`);
});

const shutdown = createShutdown(server, disconnectDb, (code) => process.exit(code));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
