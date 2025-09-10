const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const logger = require('../utils/logger');

class HostsManager {
  constructor() {
    this.hostsPath = this.getHostsPath();
    this.backupPath = path.join(os.homedir(), '.chost', 'hosts.backup');
    this.marker = '# CHost managed domains';
    this.endMarker = '# End CHost managed domains';
  }

  /**
   * Get hosts file path based on platform
   */
  getHostsPath() {
    switch (os.platform()) {
      case 'win32':
        return path.join(
          process.env.SystemRoot || 'C:\\Windows',
          'System32',
          'drivers',
          'etc',
          'hosts'
        );
      case 'darwin':
      case 'linux':
      default:
        return '/etc/hosts';
    }
  }

  /**
   * Check if we have permission to modify hosts file
   */
  async checkPermissions() {
    try {
      await fs.access(this.hostsPath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create backup of hosts file
   */
  async createBackup() {
    try {
      await fs.ensureDir(path.dirname(this.backupPath));
      await fs.copy(this.hostsPath, this.backupPath);
      logger.debug('Hosts file backup created');
    } catch (error) {
      logger.warn('Could not create hosts file backup:', error.message);
    }
  }

  /**
   * Read hosts file content
   */
  async readHosts() {
    try {
      return await fs.readFile(this.hostsPath, 'utf8');
    } catch (error) {
      throw new Error(`Cannot read hosts file: ${error.message}`);
    }
  }

  /**
   * Write hosts file content
   */
  async writeHosts(content) {
    try {
      // Create backup before writing
      await this.createBackup();

      // Write new content
      await fs.writeFile(this.hostsPath, content, 'utf8');

      // Flush DNS cache
      await this.flushDNS();

      logger.debug('Hosts file updated successfully');
    } catch (error) {
      throw new Error(`Cannot write hosts file: ${error.message}`);
    }
  }

  /**
   * Flush DNS cache based on platform
   */
  async flushDNS() {
    try {
      switch (os.platform()) {
        case 'win32':
          execSync('ipconfig /flushdns', { stdio: 'ignore' });
          break;
        case 'darwin':
          execSync('sudo dscacheutil -flushcache', { stdio: 'ignore' });
          break;
        case 'linux':
          // Try multiple methods as different Linux distros use different commands
          try {
            execSync('sudo systemctl restart systemd-resolved', { stdio: 'ignore' });
          } catch {
            try {
              execSync('sudo service network-manager restart', { stdio: 'ignore' });
            } catch {
              execSync('sudo /etc/init.d/networking restart', { stdio: 'ignore' });
            }
          }
          break;
      }
      logger.debug('DNS cache flushed');
    } catch (error) {
      logger.debug('Could not flush DNS cache:', error.message);
      // Non-fatal error - hosts file changes will still work
    }
  }

  /**
   * Parse hosts file and extract CHost managed entries
   */
  parseHosts(content) {
    const lines = content.split('\n');
    const managedStart = lines.findIndex((line) => line.includes(this.marker));
    const managedEnd = lines.findIndex((line) => line.includes(this.endMarker));

    let beforeManaged = lines;
    let managedEntries = [];
    let afterManaged = [];

    if (managedStart !== -1) {
      beforeManaged = lines.slice(0, managedStart);

      if (managedEnd !== -1) {
        managedEntries = lines
          .slice(managedStart + 1, managedEnd)
          .filter((line) => line.trim() && !line.trim().startsWith('#'));
        afterManaged = lines.slice(managedEnd + 1);
      }
    }

    return {
      beforeManaged,
      managedEntries,
      afterManaged,
    };
  }

  /**
   * Build hosts file content with managed entries
   */
  buildHostsContent(beforeManaged, domains, afterManaged) {
    const lines = [...beforeManaged];

    // Add managed section if we have domains
    if (domains.length > 0) {
      lines.push(this.marker);
      domains.forEach((domain) => {
        lines.push(`127.0.0.1\t${domain}`);
      });
      lines.push(this.endMarker);
    }

    lines.push(...afterManaged);

    return lines.join('\n');
  }

  /**
   * Get currently managed domains from hosts file
   */
  async getManagedDomains() {
    try {
      const content = await this.readHosts();
      const { managedEntries } = this.parseHosts(content);

      return managedEntries
        .map((line) => {
          const parts = line.split(/\s+/);
          return parts.length >= 2 ? parts[1] : null;
        })
        .filter(Boolean);
    } catch (error) {
      logger.debug('Could not read managed domains:', error.message);
      return [];
    }
  }

  /**
   * Add domain to hosts file
   */
  async addDomain(domain) {
    // Check permissions
    if (!(await this.checkPermissions())) {
      throw new Error('Insufficient permissions to modify hosts file. Run as administrator/sudo.');
    }

    try {
      const content = await this.readHosts();
      const { beforeManaged, managedEntries, afterManaged } = this.parseHosts(content);

      // Extract current domains from managed entries
      const currentDomains = managedEntries
        .map((line) => {
          const parts = line.split(/\s+/);
          return parts.length >= 2 ? parts[1] : null;
        })
        .filter(Boolean);

      // Add new domain if not already present
      if (!currentDomains.includes(domain)) {
        currentDomains.push(domain);
        currentDomains.sort(); // Keep domains sorted

        const newContent = this.buildHostsContent(beforeManaged, currentDomains, afterManaged);
        await this.writeHosts(newContent);

        logger.debug(`Added ${domain} to hosts file`);
      } else {
        logger.debug(`Domain ${domain} already exists in hosts file`);
      }
    } catch (error) {
      throw new Error(`Failed to add domain to hosts file: ${error.message}`);
    }
  }

  /**
   * Remove domain from hosts file
   */
  async removeDomain(domain) {
    // Check permissions
    if (!(await this.checkPermissions())) {
      throw new Error('Insufficient permissions to modify hosts file. Run as administrator/sudo.');
    }

    try {
      const content = await this.readHosts();
      const { beforeManaged, managedEntries, afterManaged } = this.parseHosts(content);

      // Extract current domains from managed entries
      const currentDomains = managedEntries
        .map((line) => {
          const parts = line.split(/\s+/);
          return parts.length >= 2 ? parts[1] : null;
        })
        .filter(Boolean);

      // Remove domain
      const updatedDomains = currentDomains.filter((d) => d !== domain);

      if (updatedDomains.length !== currentDomains.length) {
        const newContent = this.buildHostsContent(beforeManaged, updatedDomains, afterManaged);
        await this.writeHosts(newContent);

        logger.debug(`Removed ${domain} from hosts file`);
      } else {
        logger.debug(`Domain ${domain} not found in hosts file`);
      }
    } catch (error) {
      throw new Error(`Failed to remove domain from hosts file: ${error.message}`);
    }
  }

  /**
   * Sync all domains from config to hosts file
   */
  async syncDomains(domains) {
    // Check permissions
    if (!(await this.checkPermissions())) {
      throw new Error('Insufficient permissions to modify hosts file. Run as administrator/sudo.');
    }

    try {
      const content = await this.readHosts();
      const { beforeManaged, afterManaged } = this.parseHosts(content);

      const sortedDomains = [...domains].sort();
      const newContent = this.buildHostsContent(beforeManaged, sortedDomains, afterManaged);

      await this.writeHosts(newContent);

      logger.debug(`Synced ${domains.length} domains to hosts file`);
    } catch (error) {
      throw new Error(`Failed to sync domains to hosts file: ${error.message}`);
    }
  }

  /**
   * Remove all CHost managed entries from hosts file
   */
  async removeAllDomains() {
    // Check permissions
    if (!(await this.checkPermissions())) {
      throw new Error('Insufficient permissions to modify hosts file. Run as administrator/sudo.');
    }

    try {
      const content = await this.readHosts();
      const { beforeManaged, afterManaged } = this.parseHosts(content);

      const newContent = this.buildHostsContent(beforeManaged, [], afterManaged);
      await this.writeHosts(newContent);

      logger.debug('Removed all CHost managed domains from hosts file');
    } catch (error) {
      throw new Error(`Failed to remove domains from hosts file: ${error.message}`);
    }
  }

  /**
   * Restore hosts file from backup
   */
  async restoreBackup() {
    try {
      if (await fs.pathExists(this.backupPath)) {
        await fs.copy(this.backupPath, this.hostsPath);
        await this.flushDNS();
        logger.success('Hosts file restored from backup');
        return true;
      } else {
        logger.warn('No backup file found');
        return false;
      }
    } catch (error) {
      throw new Error(`Failed to restore hosts file: ${error.message}`);
    }
  }
}

module.exports = new HostsManager();
