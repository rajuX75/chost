const chalk = require('chalk');
const configManager = require('../core/config-manager');
const logger = require('../utils/logger');
const { isPortAvailable } = require('../utils/validator');

async function listCommand(options) {
  try {
    const { json } = options;

    // Load configuration
    const domains = await configManager.getDomains();
    const domainNames = Object.keys(domains);

    if (domainNames.length === 0) {
      if (json) {
        logger.json({ domains: [], count: 0 });
      } else {
        logger.info('No domains configured');
        logger.info(`Run ${chalk.cyan('chost add <domain>')} to add your first domain`);
      }
      return;
    }

    if (json) {
      // JSON output
      const output = {
        domains: domains,
        count: domainNames.length,
      };
      logger.json(output);
      return;
    }

    // Human-readable output
    logger.header(`Configured Domains (${domainNames.length})`);

    // Check port availability for each domain
    const domainsWithStatus = await Promise.all(
      domainNames.map(async (domain) => {
        const config = domains[domain];
        const portAvailable = await isPortAvailable(config.port);

        return {
          domain,
          port: config.port,
          ssl: config.ssl,
          proxy: config.proxy,
          portStatus: portAvailable ? 'available' : 'in-use',
          url: `${config.ssl ? 'https' : 'http'}://${domain}`,
          created: config.created ? new Date(config.created).toLocaleDateString() : 'unknown',
        };
      })
    );

    // Display as table
    displayDomainsTable(domainsWithStatus);

    // Show summary and tips
    showSummary(domainsWithStatus);
  } catch (error) {
    logger.error('Failed to list domains:', error);

    if (error.message.includes('No .chost configuration')) {
      logger.info(`Run ${chalk.cyan('chost init')} first to initialize configuration`);
    }

    process.exit(1);
  }
}

function displayDomainsTable(domains) {
  console.log(); // Add spacing

  // Calculate column widths
  const maxDomainWidth = Math.max(...domains.map((d) => d.domain.length), 6);
  const maxUrlWidth = Math.max(...domains.map((d) => d.url.length), 3);

  // Headers
  const headers = [
    'Domain'.padEnd(maxDomainWidth),
    'Port'.padEnd(6),
    'URL'.padEnd(maxUrlWidth),
    'SSL'.padEnd(4),
    'Proxy'.padEnd(6),
    'Status'.padEnd(8),
    'Created',
  ];

  console.log(chalk.bold(headers.join(' │ ')));
  console.log(chalk.gray('─'.repeat(headers.join(' │ ').length)));

  // Data rows
  domains.forEach((domain) => {
    const row = [
      chalk.cyan(domain.domain.padEnd(maxDomainWidth)),
      domain.port.toString().padEnd(6),
      chalk.blue(domain.url.padEnd(maxUrlWidth)),
      (domain.ssl ? chalk.green('✓') : chalk.gray('✗')).padEnd(4),
      (domain.proxy ? chalk.green('✓') : chalk.gray('✗')).padEnd(6),
      getStatusDisplay(domain.portStatus).padEnd(8),
      chalk.gray(domain.created),
    ];

    console.log(row.join(' │ '));
  });
}

function getStatusDisplay(status) {
  switch (status) {
    case 'in-use':
      return chalk.green('Active');
    case 'available':
      return chalk.yellow('Ready');
    default:
      return chalk.gray('Unknown');
  }
}

function showSummary(domains) {
  console.log(); // Add spacing

  const activeCount = domains.filter((d) => d.portStatus === 'in-use').length;
  const sslCount = domains.filter((d) => d.ssl).length;
  const proxyCount = domains.filter((d) => d.proxy).length;

  logger.keyValue({
    'Total domains': domains.length,
    'Active (ports in use)': activeCount,
    'SSL enabled': sslCount,
    'Proxy enabled': proxyCount,
  });

  // Show helpful tips
  if (activeCount > 0) {
    logger.info(`\n${chalk.green('✓')} ${activeCount} domain(s) appear to have active services`);
  }

  if (domains.length > activeCount) {
    const readyCount = domains.length - activeCount;
    logger.info(
      `${chalk.yellow('○')} ${readyCount} domain(s) are ready (start your apps on their ports)`
    );
  }

  // Show next steps
  logger.info('\nQuick actions:');
  logger.list([
    `Add domain: ${chalk.cyan('chost add myapi.local -p 3001')}`,
    `Remove domain: ${chalk.cyan('chost remove <domain>')}`,
    `Start proxy: ${chalk.cyan('chost start')}`,
    `Check status: ${chalk.cyan('chost status')}`,
  ]);

  // Show legend
  console.log();
  logger.info('Legend:');
  logger.keyValue(
    {
      [chalk.green('Active')]: 'Port is in use (service running)',
      [chalk.yellow('Ready')]: 'Port is available (start your service)',
      [chalk.green('✓')]: 'Feature enabled',
      [chalk.gray('✗')]: 'Feature disabled',
    },
    { indent: 2, keyColor: 'white', valueColor: 'gray' }
  );
}

module.exports = listCommand;
