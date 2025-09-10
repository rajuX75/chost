const chalk = require('chalk');

class Logger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    this.currentLevel = this.levels.info;
  }

  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.currentLevel;
  }

  formatMessage(level, message, prefix = '') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const levelPrefix = prefix || this.getLevelPrefix(level);

    if (global.VERBOSE) {
      return `${chalk.gray(timestamp)} ${levelPrefix} ${message}`;
    }

    return `${levelPrefix} ${message}`;
  }

  getLevelPrefix(level) {
    const prefixes = {
      error: chalk.red('✗'),
      warn: chalk.yellow('⚠'),
      info: chalk.blue('ℹ'),
      debug: chalk.gray('→'),
      success: chalk.green('✓'),
      loading: chalk.cyan('⟳'),
    };
    return prefixes[level] || prefixes.info;
  }

  error(message, error) {
    if (!this.shouldLog('error')) return;

    console.error(this.formatMessage('error', message));

    if (error && global.VERBOSE) {
      if (error.stack) {
        console.error(chalk.red(error.stack));
      } else if (error.message) {
        console.error(chalk.red(error.message));
      }
    }
  }

  warn(message) {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', message));
  }

  info(message) {
    if (!this.shouldLog('info')) return;
    console.log(this.formatMessage('info', message));
  }

  debug(message) {
    if (!this.shouldLog('debug')) return;
    console.log(this.formatMessage('debug', message));
  }

  success(message) {
    console.log(this.formatMessage('success', message, chalk.green('✓')));
  }

  loading(message) {
    process.stdout.write(this.formatMessage('loading', message, chalk.cyan('⟳')) + '\r');
  }

  clearLoading() {
    process.stdout.write('\r\x1b[K');
  }

  table(data, options = {}) {
    const { headers = [], align = 'left' } = options;

    if (!Array.isArray(data) || data.length === 0) {
      this.info('No data to display');
      return;
    }

    // Calculate column widths
    const columns = headers.length > 0 ? headers : Object.keys(data[0]);
    const widths = columns.map((col) => {
      const headerWidth = col.length;
      const dataWidth = Math.max(...data.map((row) => (row[col] || '').toString().length));
      return Math.max(headerWidth, dataWidth) + 2;
    });

    // Print headers
    if (headers.length > 0) {
      const headerRow = columns.map((col, i) => col.padEnd(widths[i])).join('');
      console.log(chalk.bold(headerRow));

      // Print separator
      const separator = columns.map((_, i) => '─'.repeat(widths[i])).join('');
      console.log(chalk.gray(separator));
    }

    // Print data rows
    data.forEach((row) => {
      const dataRow = columns
        .map((col, i) => {
          const value = (row[col] || '').toString();
          return value.padEnd(widths[i]);
        })
        .join('');
      console.log(dataRow);
    });
  }

  json(data) {
    console.log(JSON.stringify(data, null, 2));
  }

  divider() {
    console.log(chalk.gray('─'.repeat(50)));
  }

  header(title) {
    console.log(chalk.bold.cyan(`\n${title}`));
    console.log(chalk.gray('─'.repeat(title.length)));
  }

  list(items, options = {}) {
    const { bullet = '•', color = 'white' } = options;

    items.forEach((item) => {
      console.log(`  ${chalk[color](bullet)} ${item}`);
    });
  }

  keyValue(pairs, options = {}) {
    const { indent = 0, keyColor = 'cyan', valueColor = 'white' } = options;
    const padding = ' '.repeat(indent);

    Object.entries(pairs).forEach(([key, value]) => {
      console.log(`${padding}${chalk[keyColor](key + ':')} ${chalk[valueColor](value)}`);
    });
  }

  box(message, options = {}) {
    const { color = 'white', padding = 1 } = options;
    const lines = message.split('\n');
    const maxLength = Math.max(...lines.map((line) => line.length));
    const width = maxLength + padding * 2;

    const horizontal = '─'.repeat(width);
    const top = `┌${horizontal}┐`;
    const bottom = `└${horizontal}┘`;

    console.log(chalk[color](top));
    lines.forEach((line) => {
      const padded = line.padEnd(maxLength);
      const content = ' '.repeat(padding) + padded + ' '.repeat(padding);
      console.log(chalk[color](`│${content}│`));
    });
    console.log(chalk[color](bottom));
  }

  confirm(message) {
    return new Promise((resolve) => {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(`${this.getLevelPrefix('info')} ${message} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }
}

module.exports = new Logger();
