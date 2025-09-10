#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

// Import command handlers
const initCommand = require('../src/cli/init');
const addCommand = require('../src/cli/add');
const removeCommand = require('../src/cli/remove');
const listCommand = require('../src/cli/list');
const serverCommand = require('../src/cli/server');

const program = new Command();

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('✗ Unexpected error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(chalk.red('✗ Unhandled promise rejection:'), error.message);
  process.exit(1);
});

// Program configuration
program
  .name('chost')
  .description('Local development domain management system')
  .version(pkg.version)
  .option('-v, --verbose', 'Enable verbose output')
  .hook('preAction', (thisCommand) => {
    // Set global verbose flag
    global.VERBOSE = thisCommand.opts().verbose || false;
  });

// Commands
program
  .command('init')
  .description('Initialize .chost config in current directory')
  .option('-f, --force', 'Overwrite existing config file')
  .option('--no-hosts', 'Skip hosts file management')
  .action(initCommand);

program
  .command('add <domain>')
  .description('Add new domain mapping')
  .option('-p, --port <port>', 'Target port (default: 3000)', '3000')
  .option('--ssl', 'Enable SSL for this domain')
  .option('--no-proxy', 'Disable proxy for this domain')
  .action(addCommand);

program
  .command('remove <domain>')
  .alias('rm')
  .description('Remove domain mapping')
  .option('--keep-hosts', 'Keep hosts file entry')
  .action(removeCommand);

program
  .command('list')
  .alias('ls')
  .description('List all active domains')
  .option('--json', 'Output in JSON format')
  .action(listCommand);

program
  .command('start')
  .description('Start the proxy server')
  .option('-d, --daemon', 'Run as daemon process')
  .option('-p, --port <port>', 'Proxy port (default: 80)', '80')
  .action(serverCommand.start);

program.command('stop').description('Stop the proxy server').action(serverCommand.stop);

program.command('restart').description('Restart the proxy server').action(serverCommand.restart);

program
  .command('status')
  .description('Show server status and active domains')
  .action(serverCommand.status);

// Help customization
program.addHelpText(
  'after',
  `
Examples:
  ${chalk.cyan('$ chost init')}                    Initialize config in current directory
  ${chalk.cyan('$ chost add myapp.local')}         Add myapp.local pointing to port 3000
  ${chalk.cyan('$ chost add api.local -p 3001')}   Add api.local pointing to port 3001
  ${chalk.cyan('$ chost start -d')}                Start proxy server as daemon
  ${chalk.cyan('$ chost list')}                    Show all configured domains
  ${chalk.cyan('$ chost remove myapp.local')}      Remove domain mapping

Configuration:
  Config file: .chost (JSON format)
  Global config: ~/.chost/config.json

For more information, visit: https://github.com/yourusername/chost
`
);

// Parse and execute
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
