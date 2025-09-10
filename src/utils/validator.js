const net = require('net');

/**
 * Validate domain name format
 * Allows local development domains like .local, .dev, .test
 */
function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Remove protocol if present
  domain = domain.replace(/^https?:\/\//, '');

  // Basic domain format validation
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Must not be empty and match regex
  if (!domainRegex.test(domain)) {
    return false;
  }

  // Should not be common production domains to avoid conflicts
  const dangerousTlds = ['.com', '.org', '.net', '.edu', '.gov', '.mil'];
  const isDangerous = dangerousTlds.some((tld) => domain.endsWith(tld));

  if (isDangerous) {
    return false;
  }

  // Preferred local development TLDs
  const localTlds = ['.local', '.dev', '.test', '.localhost'];
  const hasLocalTld = localTlds.some((tld) => domain.endsWith(tld));

  // Allow common local patterns or local TLDs
  return hasLocalTld || domain === 'localhost' || /^[a-zA-Z0-9-]+$/.test(domain);
}

/**
 * Validate port number
 */
function validatePort(port) {
  const portNum = parseInt(port);

  if (isNaN(portNum)) {
    return false;
  }

  // Port range validation (1-65535, but typically 1024+ for user apps)
  if (portNum < 1 || portNum > 65535) {
    return false;
  }

  return true;
}

/**
 * Check if port is available
 */
function isPortAvailable(port, host = 'localhost') {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.on('error', () => {
      resolve(false);
    });

    server.on('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, host);
  });
}

/**
 * Find next available port starting from given port
 */
async function findAvailablePort(startPort = 3000, maxPort = startPort + 100) {
  for (let port = startPort; port <= maxPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${maxPort}`);
}

/**
 * Validate configuration object
 */
function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    errors.push('Config must be an object');
    return errors;
  }

  // Validate domains
  if (config.domains && typeof config.domains === 'object') {
    Object.keys(config.domains).forEach((domain) => {
      if (!validateDomain(domain)) {
        errors.push(`Invalid domain: ${domain}`);
      }

      const domainConfig = config.domains[domain];
      if (!domainConfig || typeof domainConfig !== 'object') {
        errors.push(`Invalid config for domain: ${domain}`);
        return;
      }

      if (!validatePort(domainConfig.port)) {
        errors.push(`Invalid port for domain ${domain}: ${domainConfig.port}`);
      }

      if (typeof domainConfig.ssl !== 'boolean') {
        errors.push(`SSL setting must be boolean for domain: ${domain}`);
      }

      if (typeof domainConfig.proxy !== 'boolean') {
        errors.push(`Proxy setting must be boolean for domain: ${domain}`);
      }
    });
  }

  // Validate settings
  if (config.settings && typeof config.settings === 'object') {
    const settings = config.settings;

    if (settings.proxyPort !== undefined && !validatePort(settings.proxyPort)) {
      errors.push(`Invalid proxy port: ${settings.proxyPort}`);
    }

    if (settings.sslPort !== undefined && !validatePort(settings.sslPort)) {
      errors.push(`Invalid SSL port: ${settings.sslPort}`);
    }

    if (settings.autoStart !== undefined && typeof settings.autoStart !== 'boolean') {
      errors.push('autoStart setting must be boolean');
    }

    if (
      settings.hostsFileManagement !== undefined &&
      typeof settings.hostsFileManagement !== 'boolean'
    ) {
      errors.push('hostsFileManagement setting must be boolean');
    }
  }

  return errors;
}

/**
 * Suggest alternative domain name if invalid
 */
function suggestDomainName(invalidDomain) {
  if (!invalidDomain) return 'myapp.local';

  // Clean up the domain
  let cleaned = invalidDomain
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  if (!cleaned) {
    return 'myapp.local';
  }

  // Add .local if no TLD
  if (!cleaned.includes('.')) {
    cleaned += '.local';
  }

  // Ensure it starts and ends with alphanumeric
  if (!/^[a-z0-9]/.test(cleaned)) {
    cleaned = 'app-' + cleaned;
  }

  if (!/[a-z0-9]$/.test(cleaned)) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned || 'myapp.local';
}

module.exports = {
  validateDomain,
  validatePort,
  isPortAvailable,
  findAvailablePort,
  validateConfig,
  suggestDomainName,
};
