const chalk = require('chalk');
const configManager = require('../core/config-manager');
const hostsManager = require('../core/hosts-manager');
const logger = require('../utils/logger');
const {
  validateDomain,
  validatePort,
  isPortAvailable,
  suggestDomainName,
} = require('../utils/validator');

async function addCommand(domain, options) {
  try {
    const { port, ssl, proxy } = options;

    logger.loading(`Adding domain ${domain}...`);

    // Validate domain
    if (!validateDomain(domain)) {
      logger.clearLoading();
      const suggestion = suggestDomainName(domain);
      logger.error(`Invalid domain format: ${chalk.red(domain)}`);
      logger.info(`Try: ${chalk.cyan(suggestion)}`);
      return;
    }

    // Validate port
    if (!validatePort(port)) {
      logger.clearLoading();
      logger.error(`Invalid port: ${chalk.red(port)}`);
      return;
    }

    // Check if port is available (optional warning)
    const portAvailable = await isPortAvailable(port);
    if (!portAvailable) {
      logger.clearLoading();
      const useAnyway = await logger.confirm(
        `Port ${port} appears to be in use. Add domain anyway?`
      );
      if (!useAnyway) {
        logger.info('Domain addition cancelled');
        return;
      }
    }

    logger.clearLoading();

    // Add domain to configuration
    await configManager.addDomain(domain, {
      port: parseInt(port),
      ssl: ssl,
      proxy: proxy !== false,
    });

    // Add to hosts file if enabled
    const config = await configManager.load();
    if (config.settings.hostsFileManagement) {
      try {
        await hostsManager.addDomain(domain);
        logger.success(`Added ${chalk.cyan(domain)} to hosts file`);
      } catch (error) {
        logger.warn(`Could not update hosts file: ${error.message}`);
        logger.info('You may need to run with administrator/sudo privileges');
      }
    }

    // Show success message with access info
    const protocol = ssl ? 'https' : 'http';
    const url = `${protocol}://${domain}`;

    logger.success(`Domain configured successfully!`);
    logger.keyValue(
      {
        Domain: chalk.cyan(domain),
        Target: `localhost:${port}`,
        SSL: ssl ? chalk.green('enabled') : chalk.gray('disabled'),
        Proxy: proxy !== false ? chalk.green('enabled') : chalk.gray('disabled'),
        URL: chalk.blue(url),
      },
      { indent: 2 }
    );

    // Show next steps
    showNextSteps(domain, url);
  } catch (error) {
    logger.clearLoading();
    logger.error('Failed to add domain:', error);

    // Provide helpful error messages
    if (error.message.includes('already exists')) {
      logger.info(`Use ${chalk.cyan('chost remove ' + domain)} to remove it first`);
    } else if (error.message.includes('No .chost configuration')) {
      logger.info(`Run ${chalk.cyan('chost init')} first to initialize configuration`);
    }

    process.exit(1);
  }
}

function showNextSteps(domain, url) {
  logger.info('\nNext steps:');

  const steps = [
    `Start your application on the target port`,
    `Start the proxy server: ${chalk.cyan('chost start')}`,
    `Visit your domain: ${chalk.blue(url)}`,
  ];

  logger.list(steps);

  logger.info(
    `\n${chalk.yellow('Tip:')} Use ${chalk.cyan(
      'chost status'
    )} to check if the proxy server is running`
  );
}

module.exports = addCommand;
