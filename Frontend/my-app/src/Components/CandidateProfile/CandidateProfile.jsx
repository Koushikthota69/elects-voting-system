import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './CandidateProfile.css';
import Complaint from '../Complaint/Complaint';
import { FaUser, FaTasks, FaExclamationCircle, FaFileAlt } from 'react-icons/fa';
import pdfIcon from '../Assests/pdf.png';
import { useTheme } from '../../Context/ThemeContext';
import { API_ENDPOINTS } from '../../config/api';

const CandidateProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [projects, setProjects] = useState([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const { theme } = useTheme();

  // References for sections
  const personalDetailsRef = useRef(null);
  const projectsRef = useRef(null);
  const complaintsRef = useRef(null);

  // Scroll to specific section
  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ Add function to go back to candidates list
  const goToCandidates = () => {
    navigate('/candidates');
  };

  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Fetching candidate profile for ID:', id);

        let candidateData = null;

        // ✅ FIXED: Try multiple endpoints to find candidate
        try {
          // First try: Get candidate by candidate ID
          const candidateRes = await axios.get(API_ENDPOINTS.CANDIDATE_PROFILE(id));
          if (candidateRes.data.success && candidateRes.data.data) {
            candidateData = candidateRes.data.data;
            console.log('✅ Candidate found with candidate ID');
          }
        } catch (candidateError) {
          console.log('🔄 Candidate not found by candidate ID, trying user ID...');

          // Second try: Get candidate by user ID
          try {
            const userCandidateRes = await axios.get(API_ENDPOINTS.CANDIDATE_BY_USER(id));
            if (userCandidateRes.data.success && userCandidateRes.data.data) {
              candidateData = userCandidateRes.data.data;
              console.log('✅ Candidate found with user ID');
            }
          } catch (userCandidateError) {
            console.log('❌ Candidate not found by user ID either');
            throw new Error('Candidate not found with the provided ID');
          }
        }

        if (!candidateData) {
          throw new Error('Candidate not found');
        }

        setCandidate(candidateData);

        // ✅ Get user ID from candidate data for projects
        const userId = candidateData.user?._id || candidateData.user;

        if (userId) {
          try {
            // Try to fetch projects if endpoint exists
            const projectsRes = await axios.get(API_ENDPOINTS.PROJECTS_BY_USER(userId));
            if (projectsRes.data.success) {
              setProjects(projectsRes.data.data?.filter((project) => project.isReviewed) || []);
            } else {
              setProjects([]);
            }
          } catch (projectError) {
            console.log('Projects not available:', projectError.message);
            setProjects([]);
          }

          try {
            // Try to fetch description if endpoint exists
            const descriptionRes = await axios.get(API_ENDPOINTS.CANDIDATE_DESCRIPTION_VIEW(userId));
            if (descriptionRes.data.success) {
              setDescription(descriptionRes.data.description || "No description available.");
            } else {
              setDescription("No description available.");
            }
          } catch (descError) {
            console.log('Description not available:', descError.message);
            setDescription("No description available.");
          }
        } else {
          setProjects([]);
          setDescription("No description available.");
        }

      } catch (err) {
        console.error('❌ Error fetching candidate data:', err);

        // ✅ Enhanced error handling
        if (err.response?.status === 404) {
          setError({
            message: 'Candidate profile not found.',
            details: `The ID "${id}" doesn't match any candidate profile.`,
            help: 'Please check that you are using a valid candidate ID from the candidates list.'
          });
        } else if (err.message.includes('Network Error')) {
          setError({
            message: 'Network Error',
            details: 'Unable to connect to the server. Please check your internet connection.',
            help: 'Make sure the backend server is running on port 5000.'
          });
        } else {
          setError({
            message: err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load candidate profile',
            details: 'Failed to load candidate profile. The candidate might not exist or you might be using an invalid ID.'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCandidateData();
    } else {
      setError({
        message: 'No candidate ID provided',
        details: 'Please provide a valid candidate ID in the URL.'
      });
      setLoading(false);
    }
  }, [id]);

  // ✅ FIXED: Improved retry function
  const retryFetch = () => {
    setLoading(true);
    setError(null);
    const fetchCandidateData = async () => {
      try {
        let candidateData = null;

        try {
          const candidateRes = await axios.get(API_ENDPOINTS.CANDIDATE_PROFILE(id));
          if (candidateRes.data.success) {
            candidateData = candidateRes.data.data;
          }
        } catch (candidateError) {
          try {
            const userCandidateRes = await axios.get(API_ENDPOINTS.CANDIDATE_BY_USER(id));
            if (userCandidateRes.data.success) {
              candidateData = userCandidateRes.data.data;
            }
          } catch (userCandidateError) {
            throw new Error('Candidate not found');
          }
        }

        if (candidateData) {
          setCandidate(candidateData);
          setError(null);
        } else {
          throw new Error('Candidate not found');
        }
      } catch (err) {
        setError({
          message: err.response?.data?.error || 'Failed to load candidate profile',
          details: 'Please try again later.'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCandidateData();
  };

  if (loading) {
    return (
      <div className="candidate-profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading candidate profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-profile-error">
        <div className="error-content">
          <h3>❌ {error.message}</h3>
          <p>{error.details}</p>
          {error.help && <p className="error-help">{error.help}</p>}

          <div className="error-actions">
            <button onClick={retryFetch} className="retry-button">
              Try Again
            </button>
            <button onClick={goToCandidates} className="back-button">
              ← Back to Candidates List
            </button>
          </div>

          <div className="debug-info">
            <p><strong>Debug Info:</strong></p>
            <p>Candidate ID: {id}</p>
            <p>Endpoint Tried: {API_ENDPOINTS.CANDIDATE_PROFILE(id)}</p>
            <p>Alternative Endpoint: {API_ENDPOINTS.CANDIDATE_BY_USER(id)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="candidate-profile-error">
        <div className="error-content">
          <h3>Candidate Not Found</h3>
          <p>The candidate you're looking for doesn't exist or has been removed.</p>
          <div className="error-actions">
            <button onClick={retryFetch} className="retry-button">
              Try Again
            </button>
            <button onClick={goToCandidates} className="back-button">
              ← Back to Candidates List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const openImageModal = (imageSrc) => {
    setSelectedImage(imageSrc);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // ✅ FIXED: Safe data access with fallbacks
  const userData = candidate.user || candidate;
  const candidateName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown Candidate';
  const profilePhoto = userData.profilePhoto || candidate.profilePhoto || '/default-avatar.png';
  const partyName = candidate.party?.name || 'Independent Candidate';
  const isVerified = candidate.isVerified || false;

  return (
    <div className={`candidate-profile ${theme}`}>
      {/* Navigation Buttons */}
      <div className="navigation-buttons">
        <button className="navigation-button" onClick={() => scrollToSection(personalDetailsRef)}>
          <FaUser />
          <span>Personal</span>
        </button>
        <button className="navigation-button" onClick={() => scrollToSection(projectsRef)}>
          <FaTasks />
          <span>Projects</span>
        </button>
        <button className="navigation-button" onClick={() => scrollToSection(complaintsRef)}>
          <FaExclamationCircle />
          <span>Complaints</span>
        </button>
      </div>

      {/* Personal Details Section */}
      <div ref={personalDetailsRef} className="candidate-header">
        <div className="candidate-basic-info">
          <h1 className="candidate-name">{candidateName}</h1>
          <p className="candidate-party">{partyName}</p>
          <p className={`candidate-status ${isVerified ? 'verified' : 'pending'}`}>
            {isVerified ? '✅ Verified' : '⏳ Pending Verification'}
          </p>
        </div>
        <div className="candidate-photo">
          <img
            src={profilePhoto}
            alt={candidateName}
            onClick={() => openImageModal(profilePhoto)}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmNGY0ZjQiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjQ1IiByPSIyMCIgZmlsbD0iI2NjY2NjYi8+PHJlY3QgeD0iMzUiIHk9Ijc1IiB3aWR0aD0iNTAiIGhlaWdodD0iMzAiIGZpbGw9IiNjY2NjY2IiLz48L3N2Zz4=';
            }}
          />
        </div>
      </div>

      <div className="candidate-details">
        <div className="detail-section">
          <h3>Personal Information</h3>
          <p><strong>Email:</strong> {userData.email || 'Not provided'}</p>
          <p><strong>Phone:</strong> {userData.phone || 'Not provided'}</p>
          <p><strong>NIC:</strong> {userData.nic || 'Not provided'}</p>
          <p><strong>District:</strong> {userData.district || 'Not provided'}</p>
          <p><strong>Province:</strong> {userData.province || 'Not provided'}</p>
        </div>

        <div className="detail-section">
          <h3>Candidate Information</h3>
          <p><strong>Skills:</strong> {candidate.skills?.join(', ') || 'No skills listed'}</p>
          <p><strong>Objectives:</strong> {candidate.objectives?.join(', ') || 'No objectives listed'}</p>
          <p><strong>Bio:</strong> {candidate.bio || 'No bio available'}</p>
        </div>
      </div>

      {/* Description Section */}
      {description && description !== "No description available." && (
        <div className="candidate-description">
          <h3>Candidate Description</h3>
          <div
            className="candidate-description-content"
            dangerouslySetInnerHTML={{ __html: description }}
          ></div>
        </div>
      )}

      {/* Projects Section */}
      <div ref={projectsRef} className={`candidate-projects ${theme}`}>
        <h2>Social Works & Projects</h2>
        {projects.length > 0 ? (
          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project._id} className={`project-card ${theme}`}>
                <h3>{project.title}</h3>
                <p className="project-description">{project.description}</p>

                {project.links && (
                  <div className="project-links">
                    <strong>Explore More Details:</strong>
                    <a href={project.links} target="_blank" rel="noopener noreferrer" className="project-link">
                      View Project
                    </a>
                  </div>
                )}

                {project.attachments?.length > 0 && (
                  <div className="project-attachments">
                    <strong>Attachments:</strong>
                    <div className="attachments-container">
                      {project.attachments.slice(0, 3).map((attachment, index) => {
                        const isImage = /\.(jpeg|jpg|png|gif|webp)$/i.test(attachment);
                        const isPdf = /\.pdf$/i.test(attachment);

                        return isImage ? (
                          <img
                            key={index}
                            src={attachment}
                            alt={`Attachment ${index + 1}`}
                            onClick={() => openImageModal(attachment)}
                            className="attachment-thumbnail"
                          />
                        ) : isPdf ? (
                          <a
                            key={index}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-icon-link"
                          >
                            <img
                              src={pdfIcon}
                              alt="PDF Icon"
                              className="pdf-icon"
                            />
                          </a>
                        ) : (
                          <a
                            key={index}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-icon-link"
                          >
                            <FaFileAlt className="file-icon" />
                          </a>
                        );
                      })}
                    </div>

                    {project.attachments.length > 3 && (
                      <p className="more-attachments">+{project.attachments.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-projects">
            <p>No projects or social works have been added yet.</p>
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div className="image-modal" onClick={closeImageModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal" onClick={closeImageModal}>×</button>
              <img src={selectedImage} alt="Zoomed View" className="modal-image" />
            </div>
          </div>
        )}
      </div>

      {/* Complaints Section */}
      <div ref={complaintsRef} className="complaints-section">
        <h2>Complaints & Reports</h2>
        <Complaint userId={userData._id || candidate.user} />
      </div>
    </div>
  );
};

export default CandidateProfile;