const Web3 = require('web3');
const logger = require('../../src/utils/logger');

class Web3Config {
  constructor() {
    this.web3 = null;
    this.providers = {
      mainnet: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      ropsten: `https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      rinkeby: `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      goerli: `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      ganache: 'http://localhost:7545',
      hardhat: 'http://localhost:8545'
    };
  }

  initialize(network = 'ganache') {
    try {
      const providerUrl = this.providers[network] || this.providers.ganache;
      
      this.web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
      
      logger.info(`Web3 initialized with ${network} network`);
      logger.info(`Provider URL: ${providerUrl}`);
      
      return this.web3;
    } catch (error) {
      logger.error('Failed to initialize Web3:', error);
      throw error;
    }
  }

  async checkConnection() {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    try {
      const isListening = await this.web3.eth.net.isListening();
      const networkId = await this.web3.eth.net.getId();
      const blockNumber = await this.web3.eth.getBlockNumber();

      return {
        connected: isListening,
        networkId: networkId,
        blockNumber: blockNumber,
        isSyncing: await this.web3.eth.isSyncing()
      };
    } catch (error) {
      logger.error('Web3 connection check failed:', error);
      return { connected: false, error: error.message };
    }
  }

  getWeb3() {
    if (!this.web3) {
      throw new Error('Web3 not initialized. Call initialize() first.');
    }
    return this.web3;
  }

  // Account management
  async getAccounts() {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    try {
      return await this.web3.eth.getAccounts();
    } catch (error) {
      logger.error('Failed to get accounts:', error);
      throw error;
    }
  }

  async createAccount() {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    try {
      const account = this.web3.eth.accounts.create();
      return account;
    } catch (error) {
      logger.error('Failed to create account:', error);
      throw error;
    }
  }

  // Network utilities
  async getNetworkInfo() {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    try {
      const [networkId, blockNumber, gasPrice, isSyncing] = await Promise.all([
        this.web3.eth.net.getId(),
        this.web3.eth.getBlockNumber(),
        this.web3.eth.getGasPrice(),
        this.web3.eth.isSyncing()
      ]);

      return {
        networkId,
        blockNumber,
        gasPrice: this.web3.utils.fromWei(gasPrice, 'gwei'),
        isSyncing,
        nodeInfo: await this.getNodeInfo()
      };
    } catch (error) {
      logger.error('Failed to get network info:', error);
      throw error;
    }
  }

  async getNodeInfo() {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    try {
      const nodeInfo = await this.web3.eth.getNodeInfo();
      return nodeInfo;
    } catch (error) {
      logger.warn('Could not get node info:', error.message);
      return 'Unknown';
    }
  }

  // Gas utilities
  async getGasPriceInGwei() {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    try {
      const gasPrice = await this.web3.eth.getGasPrice();
      return this.web3.utils.fromWei(gasPrice, 'gwei');
    } catch (error) {
      logger.error('Failed to get gas price:', error);
      throw error;
    }
  }

  // Contract utilities
  createContract(abi, address) {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    return new this.web3.eth.Contract(abi, address);
  }

  // Event utilities
  subscribeToEvents(contract, eventName, callback) {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    contract.events[eventName]({})
      .on('data', callback)
      .on('error', (error) => {
        logger.error(`Event subscription error for ${eventName}:`, error);
      });
  }
}

module.exports = new Web3Config();