const forge = require('node-forge');
const logger = require('../utils/logger');

class SSLManager {
  constructor() {
    // In a real implementation, you would manage cert storage here.
  }

  /**
   * Generates a self-signed certificate for a domain.
   * @param {string} domain - The domain name.
   * @returns {Promise<{private: string, cert: string}>}
   */
  async generateCertificate(domain) {
    return new Promise((resolve, reject) => {
      logger.debug(`Generating SSL certificate for ${domain}...`);

      const keys = forge.pki.rsa.generateKeyPair(2048);
      const cert = forge.pki.createCertificate();

      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(19));
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

      const attrs = [
        { name: 'commonName', value: domain },
        { name: 'countryName', value: 'US' },
        { shortName: 'ST', value: 'California' },
        { name: 'localityName', value: 'San Francisco' },
        { name: 'organizationName', value: 'CHost Self-Signed' },
        { shortName: 'OU', value: 'CHost' },
      ];

      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      cert.setExtensions([
        {
          name: 'basicConstraints',
          cA: true,
        },
        {
          name: 'keyUsage',
          keyCertSign: true,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true,
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true,
          codeSigning: true,
          emailProtection: true,
          timeStamping: true,
        },
        {
          name: 'nsCertType',
          client: true,
          server: true,
          email: true,
          objsign: true,
          sslCA: true,
          emailCA: true,
          objCA: true,
        },
        {
          name: 'subjectAltName',
          altNames: [
            {
              type: 2, // DNS
              value: domain,
            },
            {
              type: 2,
              value: 'localhost',
            }
          ],
        },
        {
          name: 'subjectKeyIdentifier',
        },
      ]);

      cert.sign(keys.privateKey, forge.md.sha256.create());

      const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
      const certPem = forge.pki.certificateToPem(cert);

      logger.debug(`SSL certificate for ${domain} generated.`);
      resolve({ private: privateKeyPem, cert: certPem });
    });
  }


  /**
   * Gets a certificate for a domain, generating it if it doesn't exist.
   * This is a simplified version that always generates.
   * @param {string} domain - The domain name.
   */
  async getCertificate(domain) {
    // A real implementation would have caching and storage logic here.
    return this.generateCertificate(domain);
  }
}

module.exports = new SSLManager();
