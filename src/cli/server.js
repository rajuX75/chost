const proxyServer = require('../core/proxy-server');
const logger = require('../utils/logger');

async function start(options) {
  logger.info('Starting proxy server...');
  try {
    await proxyServer.start();
    logger.success('Proxy server is running in the foreground.');
    logger.info('Press Ctrl+C to stop.');
    // Keep the process alive. In a real daemon, this would be handled differently.
    // For foreground mode, we just need to prevent the script from exiting.
    process.stdin.resume();

    process.on('SIGINT', async () => {
        logger.info('Shutting down proxy server...');
        await proxyServer.stop();
        process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start proxy server:', error);
    process.exit(1);
  }
}

async function stop() {
    logger.info('Stopping proxy server...');
    logger.warn('Foreground server must be stopped with Ctrl+C.');
    logger.info('This command is intended for background (daemon) mode.');
    // In a real implementation, this would use the process manager to stop the daemon.
    process.exit(0);
}

async function restart() {
    logger.info('Restarting proxy server...');
    try {
        await proxyServer.reload();
        logger.success('Proxy server restarted.');
    } catch (error) {
        logger.error('Failed to restart proxy server:', error);
        process.exit(1);
    }
}

async function status() {
    // This is a simplified status check.
    // A real implementation would check the PID file from the process manager.
    if (proxyServer.httpServer && proxyServer.httpServer.listening) {
        logger.info('Proxy server is running.');
        logger.info(`  - HTTP server on port ${proxyServer.httpServer.address().port}`);
        logger.info(`  - HTTPS server on port ${proxyServer.httpsServer.address().port}`);
    } else {
        logger.info('Proxy server is not running.');
    }
}

module.exports = {
  start,
  stop,
  restart,
  status
};
