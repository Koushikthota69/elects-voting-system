// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Voting.sol";

contract ElectionFactory {
    // Array to store all deployed voting contracts
    address[] public deployedElections;
    
    // Mapping from election ID to contract address
    mapping(uint256 => address) public electionContracts;
    
    // Mapping from creator to their created elections
    mapping(address => uint256[]) public creatorElections;
    
    // Events
    event NewElectionCreated(
        uint256 indexed electionId,
        address electionAddress,
        address creator,
        string title,
        uint256 timestamp
    );
    
    uint256 private electionIdCounter;

    /**
     * @dev Create a new voting contract
     */
    function createElection(
        string memory _title,
        uint256 _startTime,
        uint256 _endTime,
        string[] memory _candidateNames,
        string[] memory _candidateParties,
        string[] memory _candidateDescriptions
    ) external returns (address) {
        electionIdCounter++;
        
        // Deploy new Voting contract
        Voting newElection = new Voting();
        
        // Initialize the election
        newElection.createElection(
            _title,
            _startTime,
            _endTime,
            _candidateNames,
            _candidateParties,
            _candidateDescriptions
        );
        
        address electionAddress = address(newElection);
        
        // Store the contract address
        deployedElections.push(electionAddress);
        electionContracts[electionIdCounter] = electionAddress;
        creatorElections[msg.sender].push(electionIdCounter);
        
        emit NewElectionCreated(
            electionIdCounter,
            electionAddress,
            msg.sender,
            _title,
            block.timestamp
        );
        
        return electionAddress;
    }
    
    /**
     * @dev Get all deployed election addresses
     */
    function getAllElections() external view returns (address[] memory) {
        return deployedElections;
    }
    
    /**
     * @dev Get elections created by a specific address
     */
    function getElectionsByCreator(address _creator) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return creatorElections[_creator];
    }
    
    /**
     * @dev Get election contract address by ID
     */
    function getElectionAddress(uint256 _electionId) 
        external 
        view 
        returns (address) 
    {
        return electionContracts[_electionId];
    }
    
    /**
     * @dev Get total number of deployed elections
     */
    function getTotalDeployedElections() external view returns (uint256) {
        return deployedElections.length;
    }
    
    /**
     * @dev Get the latest election ID
     */
    function getLatestElectionId() external view returns (uint256) {
        return electionIdCounter;
    }
}