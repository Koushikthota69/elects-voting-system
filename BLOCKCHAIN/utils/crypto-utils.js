const crypto = require('crypto');
const Web3 = require('web3');

class CryptoUtils {
  constructor() {
    this.web3 = new Web3();
  }

  // Hash functions
  sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  keccak256(data) {
    return this.web3.utils.keccak256(data);
  }

  // Encryption
  encryptData(data, password) {
    try {
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(password, 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      cipher.setAAD(Buffer.from('additionalData'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  decryptData(encryptedData, password, iv, authTag) {
    try {
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(password, 'salt', 32);
      
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAAD(Buffer.from('additionalData'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  // Digital signatures
  signMessage(message, privateKey) {
    try {
      const messageHash = this.web3.utils.keccak256(message);
      const signature = this.web3.eth.accounts.sign(messageHash, privateKey);
      return signature;
    } catch (error) {
      throw new Error('Message signing failed: ' + error.message);
    }
  }

  verifySignature(message, signature, address) {
    try {
      const messageHash = this.web3.utils.keccak256(message);
      const recoveredAddress = this.web3.eth.accounts.recover(messageHash, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      throw new Error('Signature verification failed: ' + error.message);
    }
  }

  // Address utilities
  isValidEthereumAddress(address) {
    return this.web3.utils.isAddress(address);
  }

  toChecksumAddress(address) {
    return this.web3.utils.toChecksumAddress(address);
  }

  generateWallet() {
    return this.web3.eth.accounts.create();
  }

  privateKeyToAccount(privateKey) {
    return this.web3.eth.accounts.privateKeyToAccount(privateKey);
  }

  // Random number generation
  generateRandomBytes(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Password hashing
  hashPassword(password, salt = null) {
    const usedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, usedSalt, 1000, 64, 'sha512').toString('hex');
    return {
      hash: hash,
      salt: usedSalt
    };
  }

  verifyPassword(password, hash, salt) {
    const newHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return newHash === hash;
  }

  // Merkle tree utilities
  calculateMerkleRoot(hashes) {
    if (hashes.length === 0) return '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (hashes.length === 1) return hashes[0];

    const treeLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;
      const combined = this.web3.utils.keccak256(left + right.slice(2));
      treeLevel.push(combined);
    }

    return this.calculateMerkleRoot(treeLevel);
  }

  generateMerkleProof(hashes, index) {
    if (index < 0 || index >= hashes.length) {
      throw new Error('Index out of bounds');
    }

    let proof = [];
    let currentLevel = hashes.map(hash => this.web3.utils.keccak256(hash));

    while (currentLevel.length > 1) {
      const nextLevel = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        
        if (i === index || i + 1 === index) {
          proof.push(i === index ? right : left);
        }
        
        const parent = this.web3.utils.keccak256(left + right.slice(2));
        nextLevel.push(parent);
        
        if (i === index) {
          index = Math.floor(i / 2);
        }
      }
      
      currentLevel = nextLevel;
    }

    return proof;
  }

  // ZKP utilities (simplified)
  generateZKProof(input, witness) {
    // In a real implementation, this would use a ZKP library like snarkjs
    // This is a simplified version for demonstration
    const proof = {
      a: this.generateRandomBytes(32),
      b: this.generateRandomBytes(32),
      c: this.generateRandomBytes(32),
      input: input
    };

    return {
      proof: proof,
      publicSignals: [input]
    };
  }

  verifyZKProof(proof, publicSignals) {
    // Simplified verification - real implementation would use proper ZKP verification
    return proof && proof.a && proof.b && proof.c && publicSignals.length > 0;
  }

  // Utility functions
  hexToBytes(hex) {
    return Buffer.from(hex.slice(2), 'hex');
  }

  bytesToHex(bytes) {
    return '0x' + Buffer.from(bytes).toString('hex');
  }

  toHex(string) {
    return this.web3.utils.toHex(string);
  }

  fromHex(hex) {
    return this.web3.utils.hexToString(hex);
  }

  // Batch operations
  async batchWeb3Calls(calls) {
    const batch = new this.web3.BatchRequest();
    
    const promises = calls.map(call => {
      return new Promise((resolve, reject) => {
        batch.add(call.request((error, result) => {
          if (error) reject(error);
          else resolve(result);
        }));
      });
    });

    batch.execute();
    return Promise.all(promises);
  }
}

module.exports = new CryptoUtils();