import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_ENDPOINTS } from '../../config/api';
import './VotingInterface.css';

const VotingInterface = ({ electionType }) => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    fetchElectionDetails();
    fetchCandidates();
    checkIfVoted();
  }, [electionId, electionType]);

  const fetchElectionDetails = async () => {
    try {
      let endpoint;
      switch (electionType) {
        case 'general':
          endpoint = API_ENDPOINTS.buildUrl(API_ENDPOINTS.ELECTION_DETAILS(electionId));
          break;
        case 'presidential':
          endpoint = API_ENDPOINTS.buildUrl(API_ENDPOINTS.PRESIDENTIAL_ELECTION_DETAILS(electionId));
          break;
        case 'parliamentary':
          endpoint = API_ENDPOINTS.buildUrl(API_ENDPOINTS.PARLIAMENTARY_ELECTION_DETAILS(electionId));
          break;
        case 'provincial':
          endpoint = API_ENDPOINTS.buildUrl(API_ENDPOINTS.PROVINCIAL_ELECTION_DETAILS(electionId));
          break;
        default:
          endpoint = API_ENDPOINTS.buildUrl(API_ENDPOINTS.ELECTION_DETAILS(electionId));
      }

      const response = await axios.get(endpoint);
      if (response.data.success) {
        setElection(response.data.data);
      } else {
        // If election details fail, create a mock election object
        setElection({
          _id: electionId,
          name: `${electionType.charAt(0).toUpperCase() + electionType.slice(1)} Election`,
          description: `${electionType.charAt(0).toUpperCase() + electionType.slice(1)} Election ${electionId}`,
          startTime: new Date(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          type: electionType
        });
      }
    } catch (error) {
      console.error('Error fetching election:', error);
      // Create mock election if API fails
      setElection({
        _id: electionId,
        name: `${electionType.charAt(0).toUpperCase() + electionType.slice(1)} Election`,
        description: `${electionType.charAt(0).toUpperCase() + electionType.slice(1)} Election ${electionId}`,
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        type: electionType
      });
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.buildUrl(API_ENDPOINTS.CANDIDATES));
      if (response.data.success) {
        // Filter verified candidates only
        const verifiedCandidates = response.data.data.filter(candidate => 
          candidate.isVerified && candidate.user
        );
        setCandidates(verifiedCandidates);
      } else {
        toast.error('Failed to load candidates');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const checkIfVoted = async () => {
    try {
      const voterId = localStorage.getItem('user-id');
      if (!voterId) return;

      // Check locally first
      const votedElections = JSON.parse(localStorage.getItem('votedElections') || '{}');
      if (votedElections[electionId]) {
        setHasVoted(true);
        return;
      }

      // You can add backend check here if needed
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate) {
      toast.error('Please select a candidate');
      return;
    }

    const voterId = localStorage.getItem('user-id');
    const token = localStorage.getItem('auth-token');

    if (!voterId || !token) {
      toast.error('Please login to vote');
      navigate('/login');
      return;
    }

    setVoting(true);
    try {
      const voteData = {
        userId: voterId,
        electionId: electionId
      };

      const endpoint = API_ENDPOINTS.buildUrl(API_ENDPOINTS.VOTE_CANDIDATE(selectedCandidate));
      
      const response = await axios.post(endpoint, voteData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success || response.status === 200) {
        // Store vote in localStorage to prevent duplicate voting
        const votedElections = JSON.parse(localStorage.getItem('votedElections') || '{}');
        votedElections[electionId] = {
          candidateId: selectedCandidate,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('votedElections', JSON.stringify(votedElections));

        toast.success('Vote cast successfully!');
        setHasVoted(true);
        
        // Redirect to results page after 2 seconds
        setTimeout(() => {
          navigate(`/results/${electionType}/${electionId}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Voting error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to cast vote';
      toast.error(errorMessage);
      
      if (error.response?.status === 400 && errorMessage.includes('already voted')) {
        setHasVoted(true);
      }
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="voting-loading">
        <div className="loading-spinner"></div>
        <p>Loading election details...</p>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="voting-error">
        <h2>Election Not Found</h2>
        <p>The requested election could not be found.</p>
        <button onClick={() => navigate('/elections')} className="back-button">
          Back to Elections
        </button>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="voting-completed">
        <div className="success-icon">✓</div>
        <h2>Vote Already Cast</h2>
        <p>You have already voted in this election.</p>
        <div className="action-buttons">
          <button 
            onClick={() => navigate(`/results/${electionType}/${electionId}`)}
            className="results-button"
          >
            View Results
          </button>
          <button 
            onClick={() => navigate('/elections')}
            className="back-button"
          >
            Back to Elections
          </button>
        </div>
      </div>
    );
  }

  // Check if election is active
  const currentTime = new Date();
  const startTime = new Date(election.startTime);
  const endTime = new Date(election.endTime);
  const isElectionActive = currentTime >= startTime && currentTime <= endTime;

  if (!isElectionActive) {
    return (
      <div className="voting-inactive">
        <h2>Election {currentTime < startTime ? 'Not Started' : 'Ended'}</h2>
        <p>
          {currentTime < startTime 
            ? `This election starts on ${startTime.toLocaleString()}`
            : `This election ended on ${endTime.toLocaleString()}`
          }
        </p>
        <button 
          onClick={() => navigate(`/results/${electionType}/${electionId}`)}
          className="results-button"
        >
          View Results
        </button>
      </div>
    );
  }

  return (
    <div className="voting-interface">
      <ToastContainer />
      
      <div className="election-header">
        <h1>{election.name || election.description}</h1>
        <div className="election-info">
          <p><strong>Type:</strong> {electionType.charAt(0).toUpperCase() + electionType.slice(1)} Election</p>
          <p><strong>Voting Period:</strong> {new Date(election.startTime).toLocaleString()} to {new Date(election.endTime).toLocaleString()}</p>
        </div>
      </div>

      <div className="voting-instructions">
        <h3>Instructions</h3>
        <ul>
          <li>Select your preferred candidate by clicking on their card</li>
          <li>Review your selection before casting your vote</li>
          <li>Once cast, your vote cannot be changed</li>
          <li>Voting is anonymous and secure</li>
        </ul>
      </div>

      <div className="candidates-section">
        <h2>Candidates ({candidates.length})</h2>
        
        {candidates.length === 0 ? (
          <div className="no-candidates">
            <p>No candidates available for this election</p>
          </div>
        ) : (
          <div className="candidates-grid">
            {candidates.map(candidate => (
              <div 
                key={candidate._id}
                className={`candidate-card ${selectedCandidate === candidate._id ? 'selected' : ''}`}
                onClick={() => setSelectedCandidate(candidate._id)}
              >
                <div className="candidate-image">
                  <img 
                    src={candidate.user?.profilePhoto || '/default-avatar.png'} 
                    alt={`${candidate.user?.firstName} ${candidate.user?.lastName}`}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmNGY0ZjQiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjMyIiByPSIxNiIgZmlsbD0iI2NjY2NjYi8+PHJlY3QgeD0iMjQiIHk9IjU2IiB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIGZpbGw9IiNjY2NjY2IiLz48L3N2Zz4=';
                    }}
                  />
                </div>
                <div className="candidate-info">
                  <h3>{candidate.user?.firstName} {candidate.user?.lastName}</h3>
                  <p className="party">{candidate.party?.name || 'Independent'}</p>
                  {candidate.bio && (
                    <p className="bio">{candidate.bio.length > 100 ? candidate.bio.substring(0, 100) + '...' : candidate.bio}</p>
                  )}
                </div>
                <div className="selection-indicator">
                  {selectedCandidate === candidate._id && <div className="checkmark">✓</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCandidate && (
        <div className="selected-candidate-confirmation">
          <h3>Your Selection</h3>
          <p>You have selected: <strong>
            {candidates.find(c => c._id === selectedCandidate)?.user?.firstName} 
            {candidates.find(c => c._id === selectedCandidate)?.user?.lastName}
          </strong></p>
        </div>
      )}

      <div className="voting-actions">
        <button 
          onClick={handleVote}
          disabled={!selectedCandidate || voting || hasVoted}
          className={`vote-button ${!selectedCandidate ? 'disabled' : ''}`}
        >
          {voting ? (
            <>
              <div className="button-spinner"></div>
              Casting Vote...
            </>
          ) : (
            'Cast Vote'
          )}
        </button>
        
        <button 
          onClick={() => navigate('/elections')}
          className="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default VotingInterface;