const chalk = require('chalk');
const configManager = require('../core/config-manager');
const hostsManager = require('../core/hosts-manager');
const logger = require('../utils/logger');

async function removeCommand(domain, options) {
  try {
    const { keepHosts } = options;

    logger.loading(`Removing domain ${domain}...`);

    // Check if domain exists
    const domainConfig = await configManager.getDomain(domain);
    if (!domainConfig) {
      logger.clearLoading();
      logger.error(`Domain ${chalk.red(domain)} not found`);

      // Show available domains
      const domains = await configManager.getDomains();
      const availableDomains = Object.keys(domains);

      if (availableDomains.length > 0) {
        logger.info('Available domains:');
        logger.list(availableDomains.map((d) => chalk.cyan(d)));
      } else {
        logger.info('No domains configured. Use "chost add" to add one.');
      }

      return;
    }

    logger.clearLoading();

    // Confirm removal
    const protocol = domainConfig.ssl ? 'https' : 'http';
    const url = `${protocol}://${domain}`;

    logger.info(`About to remove domain:`);
    logger.keyValue(
      {
        Domain: chalk.cyan(domain),
        Target: `localhost:${domainConfig.port}`,
        URL: chalk.blue(url),
      },
      { indent: 2 }
    );

    let confirmed = options.force;
    if (!confirmed) {
        confirmed = await logger.confirm('Are you sure you want to remove this domain?');
    }

    if (!confirmed) {
      logger.info('Domain removal cancelled');
      return;
    }

    // Remove from configuration
    await configManager.removeDomain(domain);

    // Remove from hosts file if enabled and not keeping
    const config = await configManager.load();
    if (config.settings.hostsFileManagement && !keepHosts) {
      try {
        await hostsManager.removeDomain(domain);
        logger.success(`Removed ${chalk.cyan(domain)} from hosts file`);
      } catch (error) {
        logger.warn(`Could not update hosts file: ${error.message}`);
        logger.info('You may need to run with administrator/sudo privileges');
        logger.info(`Or manually remove "${domain}" from your hosts file`);
      }
    } else if (keepHosts) {
      logger.info(`Kept ${chalk.cyan(domain)} in hosts file (--keep-hosts flag)`);
    }

    logger.success(`Domain ${chalk.cyan(domain)} removed successfully`);

    // Show remaining domains
    const remainingDomains = await configManager.getDomains();
    const domainNames = Object.keys(remainingDomains);

    if (domainNames.length > 0) {
      logger.info(`\nRemaining domains (${domainNames.length}):`);
      logger.list(domainNames.map((d) => chalk.cyan(d)));
    } else {
      logger.info('\nNo domains remaining. The proxy server can be stopped.');
      logger.info(`Run ${chalk.cyan('chost stop')} to stop the proxy server`);
    }
  } catch (error) {
    logger.clearLoading();
    logger.error('Failed to remove domain:', error);

    if (error.message.includes('No .chost configuration')) {
      logger.info(`Run ${chalk.cyan('chost init')} first to initialize configuration`);
    }

    process.exit(1);
  }
}

module.exports = removeCommand;
