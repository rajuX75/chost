const inquirer = require('inquirer');
const chalk = require('chalk');
const configManager = require('../core/config-manager');
const logger = require('../utils/logger');
const { validateDomain, validatePort, suggestDomainName } = require('../utils/validator');

async function initCommand(options) {
  try {
    logger.header('CHost Initialization');

    // Check if already initialized
    if (await configManager.configExists() && !options.force) {
      const overwrite = await logger.confirm('Configuration file already exists. Overwrite?');
      if (!overwrite) {
        logger.info('Initialization cancelled');
        return;
      }
    }

    // Initialize basic config
    const config = await configManager.init({
      force: options.force,
      hostsFileManagement: options.hosts !== false
    });

    logger.success('Configuration file created successfully!');

    // Ask user if they want to add initial domains
    const addDomains = await logger.confirm('Would you like to add some domains now?');

    if (addDomains) {
      await addInitialDomains();
    }

    // Show next steps
    showNextSteps();

  } catch (error) {
    logger.error('Failed to initialize configuration:', error);
    process.exit(1);
  }
}

async function addInitialDomains() {
  const domains = [];
  let addMore = true;

  logger.info('\nLet\'s add some domains for your project:');

  while (addMore && domains.length < 5) { // Limit to 5 domains for initial setup
    const domain = await promptForDomain(domains);
    if (domain) {
      domains.push(domain);

      // Add domain to config
      try {
        await configManager.addDomain(domain.name, {
          port: domain.port,
          ssl: domain.ssl,
          proxy: domain.proxy
        });
      } catch (error) {
        logger.error(`Failed to add domain ${domain.name}:`, error);
      }
    }

    if (domains.length < 5) {
      addMore = await inquirer.prompt([{
        type: 'confirm',
        name: 'continue',
        message: 'Add another domain?',
        default: false
      }]).then(answers => answers.continue);
    }
  }

  if (domains.length > 0) {
    logger.success(`\nAdded ${domains.length} domain(s):`);
    domains.forEach(domain => {
      const protocol = domain.ssl ? 'https' : 'http';
      logger.info(`  ${chalk.cyan(protocol + '://' + domain.name)} → localhost:${domain.port}`);
    });
  }
}

async function promptForDomain(existingDomains) {
  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'Domain name (e.g., myapp.local):',
      default: existingDomains.length === 0 ? 'app.local' : '',
      validate: (input) => {
        if (!input.trim()) {
          return 'Domain name is required';
        }

        const domain = input.trim().toLowerCase();

        if (!validateDomain(domain)) {
          const suggestion = suggestDomainName(domain);
          return `Invalid domain format. Try: ${suggestion}`;
        }

        if (existingDomains.some(d => d.name === domain)) {
          return 'Domain already added';
        }

        return true;
      },
      filter: (input) => input.trim().toLowerCase()
