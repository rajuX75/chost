const http = require('http');
const https = require('https');
const tls = require('tls');
const httpProxy = require('http-proxy');
const configManager = require('./config-manager');
const sslManager = require('./ssl-manager');
const logger = require('../utils/logger');

class ProxyServer {
  constructor() {
    this.httpServer = null;
    this.httpsServer = null;
    this.proxy = null;
  }

  async start() {
    if (this.httpServer || this.httpsServer) {
      logger.warn('Proxy server is already running.');
      return;
    }

    await configManager.load();
    const domains = await configManager.getDomains();
    if (Object.keys(domains).length === 0) {
        logger.info('No domains configured. Proxy server not started.');
        return;
    }

    this.proxy = httpProxy.createProxyServer({});

    this.proxy.on('error', (err, req, res) => {
      const host = req.headers.host;
      const domainConfig = configManager.getDomain(host);
      logger.error(`Proxy error for ${host}:`, err.message);
      res.writeHead(502, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>502 Bad Gateway</title></head>
          <body>
            <h1>502 Bad Gateway</h1>
            <p>CHost could not connect to the target server for <strong>${host}</strong> on port <strong>${domainConfig ? domainConfig.port : 'N/A'}</strong>.</p>
            <p>Please make sure your local development server is running.</p>
            <hr>
            <em>CHost Proxy</em>
          </body>
        </html>
      `);
    });

    const requestHandler = async (req, res) => {
      const host = req.headers.host ? req.headers.host.split(':')[0] : '';
      const domainConfig = await configManager.getDomain(host);

      if (domainConfig && domainConfig.proxy !== false) {
        this.proxy.web(req, res, {
          target: `http://localhost:${domainConfig.port}`,
          ws: true, // Enable WebSocket proxying
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>404 Not Found</title></head>
            <body>
              <h1>404 Not Found</h1>
              <p>The domain <strong>${host}</strong> is not configured in CHost or proxy is disabled.</p>
              <hr>
              <em>CHost Proxy</em>
            </body>
          </html>
        `);
      }
    };

    const settings = await configManager.getSettings();
    const httpPort = settings.proxyPort || 80;
    const httpsPort = settings.sslPort || 443;

    // Create HTTP server
    this.httpServer = http.createServer(requestHandler);
    this.httpServer.listen(httpPort, () => {
      logger.info(`HTTP Proxy server started on port ${httpPort}`);
    });
    this.httpServer.on('error', (err) => {
        if (err.code === 'EACCES') {
            logger.error('Permission denied to bind to port 80. Please run with sudo.');
            process.exit(1);
        } else {
            logger.error('HTTP server error:', err);
        }
    });

    // Create HTTPS server
    const httpsOptions = {
      SNICallback: async (servername, cb) => {
        try {
          logger.debug(`SNICallback triggered for: ${servername}`);
          logger.debug(`Current working directory: ${process.cwd()}`);
          const domains = await configManager.getDomains();
          logger.debug(`All domains from config: ${JSON.stringify(domains)}`);
          const domainConfig = domains[servername];
          logger.debug(`Domain config for ${servername}: ${JSON.stringify(domainConfig)}`);

          if (!domainConfig || !domainConfig.ssl) {
            logger.warn(`No SSL configuration found for ${servername}. Rejecting connection.`);
            cb(null, null);
            return;
          }

          logger.debug(`Found SSL config for ${servername}. Getting certificate...`);
          const cert = await sslManager.getCertificate(servername);
          logger.debug(`Certificate received for ${servername}. Creating secure context.`);

          const secureContext = tls.createSecureContext({
            key: cert.private,
            cert: cert.cert,
          });

          logger.debug(`Secure context created for ${servername}. Completing callback.`);
          cb(null, secureContext);
        } catch (error) {
          logger.error(`Fatal error in SNICallback for ${servername}:`, error);
          cb(error);
        }
      },
    };

    this.httpsServer = https.createServer(httpsOptions, requestHandler);
    this.httpsServer.listen(httpsPort, () => {
      logger.info(`HTTPS Proxy server started on port ${httpsPort}`);
    });
    this.httpsServer.on('error', (err) => {
        if (err.code === 'EACCES') {
            logger.error('Permission denied to bind to port 443. Please run with sudo.');
            process.exit(1);
        } else {
            logger.error('HTTPS server error:', err);
        }
    });
  }

  stop() {
    return new Promise((resolve) => {
        let closedCount = 0;
        const totalServers = 2;

        const onServerClose = () => {
            closedCount++;
            if (closedCount === totalServers) {
                logger.info('Proxy server stopped.');
                this.httpServer = null;
                this.httpsServer = null;
                if (this.proxy) {
                  this.proxy.close();
                  this.proxy = null;
                }
                resolve();
            }
        };

        if (this.httpServer && this.httpServer.listening) {
            this.httpServer.close(onServerClose);
        } else {
            onServerClose();
        }

        if (this.httpsServer && this.httpsServer.listening) {
            this.httpsServer.close(onServerClose);
        } else {
            onServerClose();
        }
    });
  }

  async reload() {
    logger.info('Reloading proxy server...');
    await this.stop();
    await this.start();
    logger.info('Proxy server reloaded.');
  }
}

module.exports = new ProxyServer();
