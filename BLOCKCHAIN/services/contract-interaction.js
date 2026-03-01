const Web3 = require('web3');
const logger = require('../../src/utils/logger');

class ContractInteraction {
  constructor(web3, contractABI, contractAddress) {
    this.web3 = web3;
    this.contract = new web3.eth.Contract(contractABI, contractAddress);
    this.defaultGas = 500000;
  }

  async call(methodName, params = [], options = {}) {
    try {
      const method = this.contract.methods[methodName](...params);
      const result = await method.call(options);
      return result;
    } catch (error) {
      logger.error(`Contract call failed for ${methodName}:`, error);
      throw this.parseError(error);
    }
  }

  async send(methodName, params = [], fromAddress, value = '0') {
    try {
      const method = this.contract.methods[methodName](...params);
      
      const gasEstimate = await method.estimateGas({
        from: fromAddress,
        value: value
      });

      const transaction = await method.send({
        from: fromAddress,
        gas: gasEstimate,
        gasPrice: await this.web3.eth.getGasPrice(),
        value: value
      });

      logger.info(`Transaction successful: ${methodName}`, {
        method: methodName,
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        from: fromAddress
      });

      return {
        success: true,
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        gasUsed: transaction.gasUsed,
        events: transaction.events
      };
    } catch (error) {
      logger.error(`Transaction failed for ${methodName}:`, error);
      throw this.parseError(error);
    }
  }

  async getPastEvents(eventName, filter = {}, fromBlock = 0, toBlock = 'latest') {
    try {
      const events = await this.contract.getPastEvents(eventName, {
        filter: filter,
        fromBlock: fromBlock,
        toBlock: toBlock
      });
      return events;
    } catch (error) {
      logger.error(`Failed to get past events for ${eventName}:`, error);
      throw error;
    }
  }

  parseError(error) {
    if (error.message.includes('revert')) {
      return new Error('Transaction reverted. Check contract requirements.');
    }
    if (error.message.includes('gas')) {
      return new Error('Insufficient gas for transaction.');
    }
    if (error.message.includes('nonce')) {
      return new Error('Invalid nonce. Please try again.');
    }
    return error;
  }

  // Utility methods
  async getContractAddress() {
    return this.contract.options.address;
  }

  async getContractBalance() {
    const balance = await this.web3.eth.getBalance(this.contract.options.address);
    return this.web3.utils.fromWei(balance, 'ether');
  }

  encodeFunctionCall(methodName, params = []) {
    return this.contract.methods[methodName](...params).encodeABI();
  }

  decodeLogs(eventName, logs) {
    return this.contract.decodeEventLog(eventName, logs);
  }
}

module.exports = ContractInteraction;