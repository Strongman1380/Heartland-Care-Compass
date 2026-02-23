/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for encryption with key rotation support
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

class EncryptionService {
  constructor() {
    this.masterKey = null;
    this.keyVersion = 1;
  }

  /**
   * Initialize encryption service with master key
   * @param {string} masterKey - Base64 encoded master key or passphrase
   * @param {number} version - Key version for rotation
   */
  initialize(masterKey, version = 1) {
    if (!masterKey) {
      throw new Error('Master key is required');
    }
    
    // If masterKey is a passphrase, derive a key from it
    if (masterKey.length < 32) {
      const salt = crypto.randomBytes(SALT_LENGTH);
      this.masterKey = crypto.pbkdf2Sync(
        masterKey,
        salt,
        ITERATIONS,
        KEY_LENGTH,
        'sha512'
      );
    } else {
      this.masterKey = Buffer.from(masterKey, 'base64');
    }
    
    this.keyVersion = version;
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @returns {string} - Encrypted data with IV and auth tag (base64)
   */
  encrypt(plaintext) {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    if (!plaintext) {
      return null;
    }

    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag();
      
      // Combine version, IV, auth tag, and encrypted data
      const combined = Buffer.concat([
        Buffer.from([this.keyVersion]),
        iv,
        authTag,
        Buffer.from(encrypted, 'base64')
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data (base64)
   * @param {Buffer} keyOverride - Optional key for decrypting with old keys
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encryptedData, keyOverride = null) {
    if (!this.masterKey && !keyOverride) {
      throw new Error('Encryption service not initialized');
    }

    if (!encryptedData) {
      return null;
    }

    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const version = combined[0];
      const iv = combined.slice(1, 1 + IV_LENGTH);
      const authTag = combined.slice(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.slice(1 + IV_LENGTH + TAG_LENGTH);
      
      const key = keyOverride || this.masterKey;
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data (one-way, for SSN, etc.)
   * @param {string} data - Data to hash
   * @returns {string} - SHA-256 hash (hex)
   */
  hash(data) {
    if (!data) {
      return null;
    }
    
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate a secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} - Random token (hex)
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Mask sensitive data for display (e.g., SSN)
   * @param {string} data - Data to mask
   * @param {number} visibleChars - Number of characters to show at end
   * @returns {string} - Masked data
   */
  mask(data, visibleChars = 4) {
    if (!data || data.length <= visibleChars) {
      return '***';
    }
    
    const masked = '*'.repeat(data.length - visibleChars);
    const visible = data.slice(-visibleChars);
    return masked + visible;
  }

  /**
   * Re-encrypt data with a new key (for key rotation)
   * @param {string} encryptedData - Data encrypted with old key
   * @param {Buffer} oldKey - Old encryption key
   * @returns {string} - Data re-encrypted with current key
   */
  reEncrypt(encryptedData, oldKey) {
    const decrypted = this.decrypt(encryptedData, oldKey);
    return this.encrypt(decrypted);
  }

  /**
   * Generate a new master key
   * @returns {string} - Base64 encoded key
   */
  static generateMasterKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('base64');
  }
}

// Singleton instance
const encryptionService = new EncryptionService();

module.exports = {
  encryptionService,
  EncryptionService
};