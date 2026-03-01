import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Candidates.css';
import { Link } from 'react-router-dom';
import { useTheme } from '../../Context/ThemeContext';
import { API_ENDPOINTS } from '../../config/api';

const Candidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_ENDPOINTS.CANDIDATES);
        
        console.log('Candidates API Response:', response.data);
        
        // Handle different response structures
        let candidatesData = [];
        if (response.data.success) {
          candidatesData = response.data.data || [];
        } else if (Array.isArray(response.data)) {
          candidatesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          candidatesData = response.data.data;
        }
        
        // Filter only verified candidates
        const verifiedCandidates = candidatesData.filter(candidate => 
          candidate.isVerified && candidate.user
        );
        
        setCandidates(verifiedCandidates);
        setFilteredCandidates(verifiedCandidates);
        setError(null);
      } catch (err) {
        console.error('Error fetching candidates:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(err.response?.data?.message || 'Failed to fetch candidates');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  // Search bar filter
  useEffect(() => {
    const filtered = candidates.filter((candidate) =>
      (candidate.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       candidate.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       candidate.user?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       candidate.user?.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       candidate.party?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCandidates(filtered);
  }, [searchTerm, candidates]);

  if (loading) {
    return (
      <div className="loading-container">
        <p className="err-load">
          <i className="fas fa-spinner fa-spin"></i>
          Loading candidates...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          Error: {error}
        </p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`candidatee-list ${theme}`}>
      <div className="candidates-header">
        <h1>Political Candidates</h1>
        <p>Meet the candidates running in upcoming elections</p>
      </div>
      
      <div className={`candidatee-search-bar ${theme}`}>
        <input
          type="text"
          className={`candidatee-search-bar-input ${theme}`}
          placeholder="Search candidates by name, city, district, or party..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <i className="fas fa-search search-icon"></i>
      </div>
      
      <div className="candidates-stats">
        <p>Showing {filteredCandidates.length} of {candidates.length} verified candidates</p>
      </div>
      
      {filteredCandidates.length > 0 ? (
        <div className="candidates-grid">
          {filteredCandidates.map(candidate => {
            if (!candidate.user) return null;

            return (
              <div key={candidate._id} className="candidate-card">
                {/* ✅ FIX: Use candidate._id instead of candidate.user._id */}
                <Link to={`/candidate/${candidate._id}`} className="candidate-link">
                  <div className="candidate-card-content">
                    <div className="candidate-image-container">
                      <img
                        className="candidate-photo"
                        src={candidate.user.profilePhoto || '/default-avatar.png'}
                        alt={`${candidate.user.firstName} ${candidate.user.lastName}`}
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                      {candidate.isVerified && (
                        <div className="verified-badge" title="Verified Candidate">
                          <i className="fas fa-check-circle"></i>
                        </div>
                      )}
                    </div>
                    
                    <div className="candidate-info">
                      <h3 className="candidate-name">
                        {candidate.user.firstName} {candidate.user.lastName}
                      </h3>
                      
                      {candidate.party && (
                        <p className="candidate-party">
                          <i className="fas fa-flag"></i>
                          {candidate.party.name}
                        </p>
                      )}
                      
                      <div className="candidate-location">
                        <p>
                          <i className="fas fa-map-marker-alt"></i>
                          {candidate.user.city || 'Unknown City'}, {candidate.user.district || 'Unknown District'}
                        </p>
                      </div>
                      
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="candidate-skills">
                          <strong>Skills:</strong>
                          <div className="skills-tags">
                            {candidate.skills.slice(0, 3).map((skill, index) => (
                              <span key={index} className="skill-tag">{skill}</span>
                            ))}
                            {candidate.skills.length > 3 && (
                              <span className="skill-tag-more">+{candidate.skills.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {candidate.bio && (
                        <div className="candidate-bio">
                          <p>{candidate.bio.length > 120 ? candidate.bio.substring(0, 120) + '...' : candidate.bio}</p>
                        </div>
                      )}
                      
                      <div className="view-profile-btn">
                        View Full Profile →
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-results-container">
          <div className="no-results-content">
            <i className="fas fa-users no-candidates-icon"></i>
            <h3>{searchTerm ? 'No matching candidates found' : 'No Candidates Available'}</h3>
            <p>
              {searchTerm 
                ? 'Try adjusting your search terms or browse all candidates.'
                : 'There are currently no verified candidates. Check back later.'
              }
            </p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="clear-search-button"
              >
                Show All Candidates
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Candidates;