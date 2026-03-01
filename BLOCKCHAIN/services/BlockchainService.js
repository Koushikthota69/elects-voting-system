const Web3 = require('web3');
const VotingContractABI = require('../contracts/VotingContractABI.json');
const ElectionFactoryABI = require('../contracts/ElectionFactoryABI.json');
const logger = require('../../src/utils/logger');

class BlockchainService {
  constructor() {
    this.web3 = null;
    this.votingContract = null;
    this.factoryContract = null;
    this.account = null;
    this.isInitialized = false;
    this.gasLimit = 500000;
    this.gasPrice = '20000000000'; // 20 Gwei
  }

  async initialize() {
    try {
      // Initialize Web3 - using Ganache for development
      this.web3 = new Web3(
        new Web3.providers.HttpProvider('http://localhost:7545')
      );

      // Check connection
      const isConnected = await this.web3.eth.net.isListening();
      if (!isConnected) {
        throw new Error('Failed to connect to Ethereum network');
      }

      // Get accounts
      const accounts = await this.web3.eth.getAccounts();
      if (accounts.length === 0) {
        throw new Error('No Ethereum accounts available');
      }
      
      this.account = accounts[0];
      logger.info(`Using account: ${this.account}`);

      // For development, we'll deploy contracts if not already deployed
      await this.deployContracts();

      this.isInitialized = true;
      logger.info('Blockchain service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async deployContracts() {
    try {
      // Deploy Voting contract
      const VotingContract = new this.web3.eth.Contract(VotingContractABI);
      const votingDeploy = VotingContract.deploy({
        data: '0x' + require('../contracts/VotingBytecode.json').bytecode
      });

      const votingInstance = await votingDeploy.send({
        from: this.account,
        gas: this.gasLimit,
        gasPrice: this.gasPrice
      });

      this.votingContract = new this.web3.eth.Contract(
        VotingContractABI,
        votingInstance.options.address
      );

      logger.info(`Voting contract deployed at: ${votingInstance.options.address}`);

      // Store contract addresses
      this.contractAddresses = {
        voting: votingInstance.options.address,
        factory: null // Factory not deployed in this example
      };

    } catch (error) {
      logger.error('Contract deployment failed:', error);
      throw error;
    }
  }

  async createElection(electionData) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const {
        title,
        startTime,
        endTime,
        candidates
      } = electionData;

      // Prepare candidate data arrays
      const candidateNames = candidates.map(c => c.name);
      const candidateParties = candidates.map(c => c.party || '');
      const candidateDescriptions = candidates.map(c => c.description || '');

      const transaction = this.votingContract.methods.createElection(
        title,
        Math.floor(new Date(startTime).getTime() / 1000),
        Math.floor(new Date(endTime).getTime() / 1000),
        candidateNames,
        candidateParties,
        candidateDescriptions
      );

      const gasEstimate = await transaction.estimateGas({
        from: this.account
      });

      const result = await transaction.send({
        from: this.account,
        gas: gasEstimate,
        gasPrice: this.gasPrice
      });

      const electionId = result.events.ElectionCreated.returnValues.electionId;

      logger.info(`Election created on blockchain: ${electionId}`, {
        electionId,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber
      });

      return {
        electionId: parseInt(electionId),
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed
      };
    } catch (error) {
      logger.error('Failed to create election on blockchain:', error);
      throw error;
    }
  }

  async castVote(electionId, voterAddress, candidateId) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const transaction = this.votingContract.methods.castVote(
        electionId,
        candidateId
      );

      const gasEstimate = await transaction.estimateGas({
        from: voterAddress
      });

      const result = await transaction.send({
        from: voterAddress,
        gas: gasEstimate,
        gasPrice: this.gasPrice
      });

      logger.info(`Vote cast for election ${electionId}`, {
        electionId,
        voterAddress,
        candidateId,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber
      });

      return {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
        status: 'confirmed'
      };
    } catch (error) {
      logger.error('Failed to cast vote on blockchain:', error);
      throw error;
    }
  }

  async getElectionResults(electionId) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const results = await this.votingContract.methods.getElectionResults(electionId).call();

      return {
        totalVotes: parseInt(results.totalVotes),
        candidates: results.candidateIds.map((id, index) => ({
          candidateId: parseInt(id),
          name: results.candidateNames[index],
          voteCount: parseInt(results.candidateVotes[index])
        }))
      };
    } catch (error) {
      logger.error('Failed to get election results from blockchain:', error);
      throw error;
    }
  }

  async verifyVote(electionId, voterAddress) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const voteDetails = await this.votingContract.methods.verifyVote(
        electionId,
        voterAddress
      ).call();

      return {
        exists: voteDetails.voted,
        candidateId: parseInt(voteDetails.candidateId),
        timestamp: new Date(parseInt(voteDetails.timestamp) * 1000),
        voted: voteDetails.voted
      };
    } catch (error) {
      logger.error('Failed to verify vote on blockchain:', error);
      throw error;
    }
  }

  async getElectionDetails(electionId) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const details = await this.votingContract.methods.getElectionDetails(electionId).call();

      return {
        title: details.title,
        startTime: new Date(parseInt(details.startTime) * 1000),
        endTime: new Date(parseInt(details.endTime) * 1000),
        creator: details.creator,
        isActive: details.isActive,
        totalVotes: parseInt(details.totalVotes),
        candidateCount: parseInt(details.candidateCount)
      };
    } catch (error) {
      logger.error('Failed to get election details from blockchain:', error);
      throw error;
    }
  }

  async hasVoterVoted(electionId, voterAddress) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      return await this.votingContract.methods.hasVoterVoted(electionId, voterAddress).call();
    } catch (error) {
      logger.error('Failed to check voter status:', error);
      throw error;
    }
  }

  async getTransactionReceipt(transactionHash) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      return await this.web3.eth.getTransactionReceipt(transactionHash);
    } catch (error) {
      logger.error('Failed to get transaction receipt:', error);
      throw error;
    }
  }

  async getCurrentBlock() {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    return await this.web3.eth.getBlockNumber();
  }

  async getAccountBalance(address) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    const balance = await this.web3.eth.getBalance(address);
    return this.web3.utils.fromWei(balance, 'ether');
  }
}

module.exports = new BlockchainService();