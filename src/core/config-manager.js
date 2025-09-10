const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { validateDomain, validatePort } = require('../utils/validator');
const logger = require('../utils/logger');

class ConfigManager {
  constructor() {
    this.configPath = path.join(process.cwd(), '.chost');
    this.globalConfigPath = path.join(os.homedir(), '.chost', 'config.json');
    this.globalConfigDir = path.dirname(this.globalConfigPath);
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      domains: {},
      settings: {
        proxyPort: 80,
        sslPort: 443,
        autoStart: false,
        hostsFileManagement: true,
        logLevel: 'info',
      },
      metadata: {
        version: require('../../package.json').version,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    };
  }

  /**
   * Check if local config exists
   */
  async configExists() {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize configuration file
   */
  async init(options = {}) {
    const { force = false, hostsFileManagement = true } = options;

    // Check if config already exists
    if ((await this.configExists()) && !force) {
      throw new Error('Configuration file already exists. Use --force to overwrite.');
    }

    // Ensure global config directory exists
    await fs.ensureDir(this.globalConfigDir);

    // Create default config
    const config = this.getDefaultConfig();
    config.settings.hostsFileManagement = hostsFileManagement;

    // Write config file
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));

    logger.success(`Configuration initialized: ${chalk.cyan('.chost')}`);
    return config;
  }

  /**
   * Load configuration
   */
  async load() {
    try {
      if (!(await this.configExists())) {
        throw new Error('No .chost configuration found. Run "chost init" first.');
      }

      const configData = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData);

      // Validate and migrate config if needed
      return this.validateAndMigrate(config);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON in .chost configuration file');
      }
      throw error;
    }
  }

  /**
   * Save configuration
   */
  async save(config) {
    // Update metadata
    config.metadata = {
      ...config.metadata,
      updated: new Date().toISOString(),
    };

    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    logger.debug('Configuration saved');
  }

  /**
   * Add domain to configuration
   */
  async addDomain(domain, options = {}) {
    const { port = 3000, ssl = false, proxy = true } = options;

    // Validate inputs
    if (!validateDomain(domain)) {
      throw new Error(`Invalid domain format: ${domain}`);
    }

    if (!validatePort(port)) {
      throw new Error(`Invalid port: ${port}`);
    }

    // Load current config
    const config = await this.load();

    // Check if domain already exists
    if (config.domains[domain]) {
      throw new Error(`Domain ${domain} already exists`);
    }

    // Add domain
    config.domains[domain] = {
      port: parseInt(port),
      ssl: ssl,
      proxy: proxy,
      created: new Date().toISOString(),
    };

    // Save config
    await this.save(config);

    logger.success(`Added domain: ${chalk.cyan(domain)} → localhost:${port}`);
    return config;
  }

  /**
   * Remove domain from configuration
   */
  async removeDomain(domain) {
    // Load current config
    const config = await this.load();

    // Check if domain exists
    if (!config.domains[domain]) {
      throw new Error(`Domain ${domain} not found`);
    }

    // Remove domain
    delete config.domains[domain];

    // Save config
    await this.save(config);

    logger.success(`Removed domain: ${chalk.cyan(domain)}`);
    return config;
  }

  /**
   * Get all domains
   */
  async getDomains() {
    const config = await this.load();
    return config.domains;
  }

  /**
   * Get domain configuration
   */
  async getDomain(domain) {
    const domains = await this.getDomains();
    return domains[domain] || null;
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings) {
    const config = await this.load();
    config.settings = { ...config.settings, ...newSettings };
    await this.save(config);
    return config.settings;
  }

  /**
   * Get settings
   */
  async getSettings() {
    const config = await this.load();
    return config.settings;
  }

  /**
   * Validate and migrate configuration
   */
  validateAndMigrate(config) {
    // Ensure required properties exist
    if (!config.domains) config.domains = {};
    if (!config.settings) config.settings = this.getDefaultConfig().settings;
    if (!config.metadata) config.metadata = this.getDefaultConfig().metadata;

    // Validate domains
    Object.keys(config.domains).forEach((domain) => {
      if (!validateDomain(domain)) {
        logger.warn(`Invalid domain in config: ${domain}`);
        delete config.domains[domain];
      }

      const domainConfig = config.domains[domain];
      if (!validatePort(domainConfig.port)) {
        logger.warn(`Invalid port for domain ${domain}: ${domainConfig.port}`);
        domainConfig.port = 3000;
      }
    });

    return config;
  }

  /**
   * Get global configuration path
   */
  getGlobalConfigPath() {
    return this.globalConfigPath;
  }

  /**
   * Get local configuration path
   */
  getLocalConfigPath() {
    return this.configPath;
  }
}

module.exports = new ConfigManager();
