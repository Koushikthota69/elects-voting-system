const Web3 = require('web3');
const logger = require('../../src/utils/logger');

class TransactionManager {
  constructor(web3) {
    this.web3 = web3;
    this.pendingTransactions = new Map();
    this.transactionHistory = new Map();
  }

  async sendTransaction(transactionConfig) {
    const {
      from,
      to,
      data,
      value = '0',
      gasLimit,
      gasPrice,
      nonce
    } = transactionConfig;

    try {
      const transactionObject = {
        from: from,
        to: to,
        data: data,
        value: value,
        gas: gasLimit || await this.estimateGas(transactionConfig),
        gasPrice: gasPrice || await this.web3.eth.getGasPrice(),
        nonce: nonce || await this.web3.eth.getTransactionCount(from, 'pending')
      };

      // Sign transaction (in real scenario, you'd use a private key or wallet)
      const signedTx = await this.web3.eth.accounts.signTransaction(
        transactionObject,
        process.env.PRIVATE_KEY // This should be stored securely
      );

      // Send transaction
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      // Store in history
      this.transactionHistory.set(receipt.transactionHash, {
        ...receipt,
        timestamp: new Date(),
        status: 'confirmed'
      });

      logger.info('Transaction completed successfully', {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        from: from,
        to: to
      });

      return receipt;

    } catch (error) {
      logger.error('Transaction failed:', error);
      throw this.handleTransactionError(error);
    }
  }

  async estimateGas(transactionConfig) {
    try {
      return await this.web3.eth.estimateGas({
        from: transactionConfig.from,
        to: transactionConfig.to,
        data: transactionConfig.data,
        value: transactionConfig.value
      });
    } catch (error) {
      logger.error('Gas estimation failed:', error);
      throw new Error('Gas estimation failed: ' + error.message);
    }
  }

  async getTransactionStatus(transactionHash) {
    try {
      const transaction = await this.web3.eth.getTransaction(transactionHash);
      
      if (!transaction) {
        return { status: 'not_found' };
      }

      const receipt = await this.web3.eth.getTransactionReceipt(transactionHash);

      if (!receipt) {
        return { status: 'pending' };
      }

      return {
        status: receipt.status ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        confirmations: await this.getConfirmations(receipt.blockNumber)
      };
    } catch (error) {
      logger.error('Failed to get transaction status:', error);
      throw error;
    }
  }

  async getConfirmations(blockNumber) {
    try {
      const currentBlock = await this.web3.eth.getBlockNumber();
      return currentBlock - blockNumber;
    } catch (error) {
      return 0;
    }
  }

  async waitForConfirmation(transactionHash, timeout = 120000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(async () => {
        try {
          const status = await this.getTransactionStatus(transactionHash);
          
          if (status.status === 'confirmed') {
            clearInterval(checkInterval);
            resolve(status);
          } else if (status.status === 'failed') {
            clearInterval(checkInterval);
            reject(new Error('Transaction failed'));
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(new Error('Transaction confirmation timeout'));
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 2000); // Check every 2 seconds
    });
  }

  handleTransactionError(error) {
    if (error.message.includes('revert')) {
      return new Error('Transaction reverted by the EVM');
    }
    if (error.message.includes('gas')) {
      return new Error('Insufficient gas for transaction');
    }
    if (error.message.includes('nonce')) {
      return new Error('Invalid nonce. Please try again');
    }
    if (error.message.includes('insufficient funds')) {
      return new Error('Insufficient balance for transaction');
    }
    return error;
  }

  // Transaction history methods
  getTransactionHistory(address, limit = 50) {
    const history = Array.from(this.transactionHistory.values())
      .filter(tx => tx.from === address || tx.to === address)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    return history;
  }

  getTransactionByHash(transactionHash) {
    return this.transactionHistory.get(transactionHash);
  }

  // Utility methods
  async getCurrentGasPrice() {
    return await this.web3.eth.getGasPrice();
  }

  async getRecommendedGasLimit(transactionConfig) {
    const estimated = await this.estimateGas(transactionConfig);
    return Math.floor(estimated * 1.2); // Add 20% buffer
  }

  validateAddress(address) {
    return this.web3.utils.isAddress(address);
  }

  toWei(amount, unit = 'ether') {
    return this.web3.utils.toWei(amount.toString(), unit);
  }

  fromWei(amount, unit = 'ether') {
    return this.web3.utils.fromWei(amount.toString(), unit);
  }
}

module.exports = TransactionManager;