const app = require('./src/app');
const { initBrowser, closeBrowser } = require('./src/services/browser.service');
const { PORT } = require('./src/config/env');
const logger = require('./src/utils/logger');

let server;

const startServer = async () => {
  try {
    // Initialize persistent browser instance for the pool
    await initBrowser();

    server = app.listen(PORT, () => {
      logger.info(`Flicks Backend Server listening on port ${PORT}`);
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info('Shutting down server gracefully...');
  
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
    });
  }
  
  await closeBrowser();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled rejection (server kept running): ${message}`);
});

startServer();
