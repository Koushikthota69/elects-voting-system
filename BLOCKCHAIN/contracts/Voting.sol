// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Voting {
    struct Election {
        string title;
        uint256 startTime;
        uint256 endTime;
        address creator;
        bool isActive;
        uint256 candidateCount;
        uint256 totalVotes;
        bool exists;
    }

    struct Candidate {
        uint256 id;
        string name;
        string party;
        string description;
        uint256 voteCount;
    }

    struct Vote {
        address voter;
        uint256 candidateId;
        uint256 timestamp;
        bool exists;
    }

    // Mappings
    mapping(uint256 => Election) public elections;
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => Vote)) public voterVotes;
    mapping(uint256 => mapping(uint256 => uint256)) public voteCounts;

    // State variables
    uint256 public electionCount;
    address public admin;

    // Events
    event ElectionCreated(
        uint256 indexed electionId, 
        string title, 
        address creator, 
        uint256 startTime, 
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed electionId, 
        address indexed voter, 
        uint256 candidateId, 
        uint256 timestamp
    );
    
    event ElectionEnded(uint256 indexed electionId, uint256 totalVotes);
    event ElectionStatusChanged(uint256 indexed electionId, bool isActive);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(elections[_electionId].exists, "Election does not exist");
        _;
    }

    modifier onlyDuringElection(uint256 _electionId) {
        require(elections[_electionId].isActive, "Election is not active");
        require(block.timestamp >= elections[_electionId].startTime, "Election has not started");
        require(block.timestamp <= elections[_electionId].endTime, "Election has ended");
        _;
    }

    modifier onlyBeforeElection(uint256 _electionId) {
        require(block.timestamp < elections[_electionId].startTime, "Election has already started");
        _;
    }

    constructor() {
        admin = msg.sender;
        electionCount = 0;
    }

    /**
     * @dev Create a new election
     */
    function createElection(
        string memory _title,
        uint256 _startTime,
        uint256 _endTime,
        string[] memory _candidateNames,
        string[] memory _candidateParties,
        string[] memory _candidateDescriptions
    ) external onlyAdmin returns (uint256) {
        require(_startTime < _endTime, "Invalid election times");
        require(_candidateNames.length > 0, "At least one candidate required");
        require(_candidateNames.length == _candidateParties.length, "Candidate data mismatch");
        require(_candidateNames.length == _candidateDescriptions.length, "Candidate data mismatch");

        electionCount++;
        uint256 electionId = electionCount;

        elections[electionId] = Election({
            title: _title,
            startTime: _startTime,
            endTime: _endTime,
            creator: msg.sender,
            isActive: true,
            candidateCount: _candidateNames.length,
            totalVotes: 0,
            exists: true
        });

        // Add candidates
        for (uint256 i = 0; i < _candidateNames.length; i++) {
            candidates[electionId][i + 1] = Candidate({
                id: i + 1,
                name: _candidateNames[i],
                party: _candidateParties[i],
                description: _candidateDescriptions[i],
                voteCount: 0
            });
        }

        emit ElectionCreated(electionId, _title, msg.sender, _startTime, _endTime);
        return electionId;
    }

    /**
     * @dev Cast a vote in an election
     */
    function castVote(uint256 _electionId, uint256 _candidateId) 
        external 
        electionExists(_electionId)
        onlyDuringElection(_electionId) 
    {
        require(!hasVoted[_electionId][msg.sender], "Already voted in this election");
        require(_candidateId > 0 && _candidateId <= elections[_electionId].candidateCount, "Invalid candidate");

        // Record the vote
        hasVoted[_electionId][msg.sender] = true;
        voteCounts[_electionId][_candidateId]++;
        elections[_electionId].totalVotes++;
        candidates[_electionId][_candidateId].voteCount++;

        voterVotes[_electionId][msg.sender] = Vote({
            voter: msg.sender,
            candidateId: _candidateId,
            timestamp: block.timestamp,
            exists: true
        });

        emit VoteCast(_electionId, msg.sender, _candidateId, block.timestamp);
    }

    /**
     * @dev Get election results
     */
    function getElectionResults(uint256 _electionId) 
        external 
        view 
        electionExists(_electionId)
        returns (
            uint256[] memory candidateIds,
            uint256[] memory candidateVotes,
            string[] memory candidateNames,
            uint256 totalVotes
        ) 
    {
        Election memory election = elections[_electionId];
        uint256 count = election.candidateCount;

        candidateIds = new uint256[](count);
        candidateVotes = new uint256[](count);
        candidateNames = new string[](count);

        for (uint256 i = 1; i <= count; i++) {
            candidateIds[i-1] = i;
            candidateVotes[i-1] = candidates[_electionId][i].voteCount;
            candidateNames[i-1] = candidates[_electionId][i].name;
        }

        totalVotes = election.totalVotes;
    }

    /**
     * @dev Verify if a voter has voted and get their vote details
     */
    function verifyVote(uint256 _electionId, address _voter) 
        external 
        view 
        electionExists(_electionId)
        returns (
            bool voted,
            uint256 candidateId,
            uint256 timestamp
        ) 
    {
        Vote memory vote = voterVotes[_electionId][_voter];
        return (
            vote.exists,
            vote.candidateId,
            vote.timestamp
        );
    }

    /**
     * @dev End an election manually (admin only)
     */
    function endElection(uint256 _electionId) 
        external 
        onlyAdmin 
        electionExists(_electionId) 
    {
        require(elections[_electionId].isActive, "Election already ended");
        
        elections[_electionId].isActive = false;
        emit ElectionEnded(_electionId, elections[_electionId].totalVotes);
    }

    /**
     * @dev Toggle election status (admin only)
     */
    function toggleElectionStatus(uint256 _electionId) 
        external 
        onlyAdmin 
        electionExists(_electionId) 
    {
        elections[_electionId].isActive = !elections[_electionId].isActive;
        emit ElectionStatusChanged(_electionId, elections[_electionId].isActive);
    }

    /**
     * @dev Get election details
     */
    function getElectionDetails(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (
            string memory title,
            uint256 startTime,
            uint256 endTime,
            address creator,
            bool isActive,
            uint256 totalVotes,
            uint256 candidateCount
        )
    {
        Election memory election = elections[_electionId];
        return (
            election.title,
            election.startTime,
            election.endTime,
            election.creator,
            election.isActive,
            election.totalVotes,
            election.candidateCount
        );
    }

    /**
     * @dev Get candidate details
     */
    function getCandidateDetails(uint256 _electionId, uint256 _candidateId)
        external
        view
        electionExists(_electionId)
        returns (
            string memory name,
            string memory party,
            string memory description,
            uint256 voteCount
        )
    {
        require(_candidateId > 0 && _candidateId <= elections[_electionId].candidateCount, "Invalid candidate");
        
        Candidate memory candidate = candidates[_electionId][_candidateId];
        return (
            candidate.name,
            candidate.party,
            candidate.description,
            candidate.voteCount
        );
    }

    /**
     * @dev Check if voter has voted in an election
     */
    function hasVoterVoted(uint256 _electionId, address _voter) 
        external 
        view 
        electionExists(_electionId)
        returns (bool) 
    {
        return hasVoted[_electionId][_voter];
    }

    /**
     * @dev Get total number of elections
     */
    function getTotalElections() external view returns (uint256) {
        return electionCount;
    }
}