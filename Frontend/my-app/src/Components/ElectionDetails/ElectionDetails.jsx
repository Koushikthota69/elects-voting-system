import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ElectionDetails.css';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import vote from '../Assests/online-voting.png';
import { useTheme } from '../../Context/ThemeContext';
import { API_ENDPOINTS } from '../../config/api';
import FaceRegistration from '../FaceRegistration/FaceRegistration';

const ElectionDetails = () => {
  const { theme } = useTheme();
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [hasVoted, setHasVoted] = useState(false); // ✅ FIX: simple boolean instead of candidateId comparison
  const [votedCandidateId, setVotedCandidateId] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [electionStatus, setElectionStatus] = useState('');
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [pendingVote, setPendingVote] = useState(null);
  const [isCheckingFace, setIsCheckingFace] = useState(false);
  const navigate = useNavigate();

  const parseElectionDateTime = (electionData) => {
    if (!electionData) {
      const defaultStart = new Date(Date.now() + 60 * 60 * 1000);
      const defaultEnd = new Date(defaultStart.getTime() + 12 * 60 * 60 * 1000);
      return { startTime: defaultStart, endTime: defaultEnd };
    }

    try {
      let startTime, endTime;

      if (electionData.date && electionData.startTime && electionData.endTime) {
        const datePart = typeof electionData.date === 'string'
          ? electionData.date.split('T')[0]
          : new Date(electionData.date).toISOString().split('T')[0];

        const formatTimeString = (timeStr) => {
          if (!timeStr) return '00:00';
          if (timeStr.includes(':')) {
            const parts = timeStr.split(':');
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
          }
          return '00:00';
        };

        const startTimeFormatted = formatTimeString(electionData.startTime);
        const endTimeFormatted = formatTimeString(electionData.endTime);

        startTime = new Date(`${datePart}T${startTimeFormatted}`);
        endTime = new Date(`${datePart}T${endTimeFormatted}`);
      } else if (electionData.startTime && electionData.endTime) {
        startTime = new Date(electionData.startTime);
        endTime = new Date(electionData.endTime);
      } else {
        startTime = new Date(Date.now() + 60 * 60 * 1000);
        endTime = new Date(Date.now() + 13 * 60 * 60 * 1000);
      }

      if (isNaN(startTime.getTime())) startTime = new Date(Date.now() + 60 * 60 * 1000);
      if (isNaN(endTime.getTime())) endTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000);

      return { startTime, endTime };
    } catch (error) {
      console.error('❌ Date parsing error:', error);
      const defaultStart = new Date(Date.now() + 60 * 60 * 1000);
      const defaultEnd = new Date(defaultStart.getTime() + 12 * 60 * 60 * 1000);
      return { startTime: defaultStart, endTime: defaultEnd };
    }
  };

  const checkFaceRegistrationStatus = async () => {
    const token = localStorage.getItem('auth-token');
    if (!token) return false;

    setIsCheckingFace(true);
    try {
      const response = await axios.get(API_ENDPOINTS.FACE_STATUS, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      console.log('✅ Face registration status:', response.data.isFaceRegistered);
      return response.data.isFaceRegistered;
    } catch (error) {
      console.error('❌ Error checking face status:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user-id');
        navigate('/login');
        return false;
      }
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        return true;
      }
      return false;
    } finally {
      setIsCheckingFace(false);
    }
  };

  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        const [electionResponse, candidatesResponse] = await Promise.all([
          axios.get(API_ENDPOINTS.ELECTION_DETAILS(id)),
          axios.get(API_ENDPOINTS.CANDIDATES)
        ]);

        const electionData = electionResponse.data.data;
        if (!electionData) throw new Error('Election data not found');

        setElection(electionData);
        setCandidates(candidatesResponse.data.data || []);

        // ✅ FIX: Correctly check if user has already voted
        const userId = localStorage.getItem('user-id');
        if (userId && electionData.results && electionData.results.voteDistribution) {
          const votedEntry = electionData.results.voteDistribution.find(vd =>
            vd.voters && vd.voters.map(v => v.toString()).includes(userId.toString())
          );
          if (votedEntry) {
            setHasVoted(true);
            setVotedCandidateId(votedEntry.candidateId?.toString());
          }
        }

      } catch (err) {
        console.error('❌ Error fetching election data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load election data');
      } finally {
        setLoading(false);
      }
    };

    fetchElectionData();
  }, [id]);

  useEffect(() => {
    const updateElectionStatus = () => {
      if (!election) return;
      const now = new Date();
      const { startTime, endTime } = parseElectionDateTime(election);
      const timeLeft = startTime - now;

      if (timeLeft > 0) {
        setElectionStatus('upcoming');
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        setCountdown(days > 0 ? `${days}d ${hours}h ${minutes}m ${seconds}s` : `${hours}h ${minutes}m ${seconds}s`);
      } else if (now >= startTime && now <= endTime) {
        setElectionStatus('active');
        const timeRemaining = endTime - now;
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        setCountdown(`🔴 Live - ${hours}h ${minutes}m ${seconds}s left`);
      } else {
        setElectionStatus('ended');
        setCountdown('🔴 Election Ended');
      }
    };

    updateElectionStatus();
    const interval = setInterval(updateElectionStatus, 1000);
    return () => clearInterval(interval);
  }, [election]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not set';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Date not set' : date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return 'Date not set'; }
  };

  const formatDateTime = (dateString, timeString) => {
    try {
      const { startTime } = parseElectionDateTime({ date: dateString, startTime: timeString });
      if (isNaN(startTime.getTime())) return 'Date/Time not set';
      return startTime.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch { return 'Date/Time not set'; }
  };

  const handleVote = async (candidate, candidateId) => {
    console.log('🗳️ Attempting to vote for candidate:', candidateId);

    if (electionStatus === 'upcoming') {
      Swal.fire({ icon: 'error', title: 'Voting Not Started', text: `Voting starts on ${formatDateTime(election.date, election.startTime)}` });
      return;
    }
    if (electionStatus === 'ended') {
      Swal.fire({ icon: 'error', title: 'Voting Ended', text: `Voting ended on ${formatDateTime(election.date, election.endTime)}` });
      return;
    }

    // ✅ FIX: Use hasVoted boolean for already-voted check
    if (hasVoted) {
      Swal.fire({ icon: 'error', title: 'Already Voted', text: 'You have already voted in this election!' });
      return;
    }

    if (!candidate.isVerified) {
      Swal.fire({ icon: 'error', title: 'Candidate Not Verified', text: 'This candidate is not verified and cannot receive votes.' });
      return;
    }

    const token = localStorage.getItem('auth-token');
    const userId = localStorage.getItem('user-id');

    if (!token || !userId) {
      Swal.fire({ icon: 'error', title: 'Login Required', text: 'Please log in to vote.' });
      navigate('/login');
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Your Vote',
      html: `
        <div style="text-align: center;">
          <p>You are about to vote for:</p>
          <p style="font-size: 1.2em; font-weight: bold; color: #007bff; margin: 10px 0;">
            ${candidate.user?.firstName} ${candidate.user?.lastName}
          </p>
          ${candidate.party ? `<p style="color: #666;">Party: ${candidate.party.name}</p>` : ''}
          <p style="color: #dc3545; font-size: 0.9em; margin-top: 15px;">
            <strong>Warning:</strong> This action cannot be undone.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, vote now!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const isFaceRegistered = await checkFaceRegistrationStatus();
      if (!isFaceRegistered) {
        setPendingVote({ candidate, candidateId });
        setShowFaceRegistration(true);
        return;
      }
      await proceedWithVote(candidate, candidateId, token, userId);
    } catch (err) {
      console.error('❌ Initial voting error:', err);
      handleVotingError(err);
    }
  };

  const proceedWithVote = async (candidate, candidateId, token, userId) => {
    let videoStream = null;

    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      });

      const videoElement = document.createElement('video');
      videoElement.srcObject = videoStream;
      await videoElement.play();

      const captureResult = await Swal.fire({
        title: 'Identity Verification',
        html: `
          <div style="text-align: center;">
            <p style="margin-bottom: 15px; font-size: 1.1em; color: #d9534f;">
              <strong>IMPORTANT:</strong> You must be the same person who registered for voting
            </p>
            <video id="video-feed" autoplay playsinline style="width: 100%; max-width: 400px; border-radius: 8px; border: 2px solid #007bff;"></video>
            <p style="margin-top: 10px; color: #666; font-size: 0.9em;">
              Ensure good lighting, face clearly visible, look directly at camera
            </p>
          </div>
        `,
        didOpen: () => {
          const videoFeed = Swal.getHtmlContainer().querySelector('#video-feed');
          videoFeed.srcObject = videoStream;
        },
        showCancelButton: true,
        confirmButtonText: 'Capture & Verify Identity',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#007bff',
        allowOutsideClick: false,
        preConfirm: async () => {
          try {
            Swal.fire({
              title: 'Verifying Identity...',
              html: `<div style="text-align: center;"><p>Comparing with your registered photo...</p></div>`,
              allowOutsideClick: false,
              didOpen: () => { Swal.showLoading(); }
            });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise((resolve) =>
              canvas.toBlob(resolve, 'image/jpeg', 0.9)
            );

            const formData = new FormData();
            formData.append('photo', blob, 'verification.jpg');

            console.log('🔍 Starting PURE JS face verification...');

            const verificationResponse = await Promise.race([
              axios.post(API_ENDPOINTS.FACE_VERIFICATION, formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                  'Authorization': `Bearer ${token}`,
                },
                timeout: 45000
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Verification timeout. Please try again.')), 45000)
              )
            ]);

            console.log('✅ Pure JS face verification result:', verificationResponse.data);

            if (verificationResponse.data.success) {
              console.log('🗳️ Submitting vote after successful verification...');

              // ✅ FIX: Send userId (not voterId) in request body
              const voteResponse = await axios.post(
                API_ENDPOINTS.VOTE_GENERAL_ELECTION(election._id, candidateId),
                {
                  userId: userId,
                  electionId: election._id
                },
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 10000
                }
              );

              console.log('✅ Vote submitted successfully:', voteResponse.data);

              // ✅ FIX: Set both hasVoted and votedCandidateId correctly
              setHasVoted(true);
              setVotedCandidateId(candidateId.toString());

              return {
                success: true,
                data: voteResponse.data,
                verification: verificationResponse.data
              };
            } else {
              const similarity = verificationResponse.data.similarity * 100;
              const threshold = verificationResponse.data.threshold * 100;
              let detailedMessage = verificationResponse.data.message;
              if (verificationResponse.data.suggestion) {
                detailedMessage += `\n\n${verificationResponse.data.suggestion}`;
              }
              throw new Error(`${detailedMessage}\n\nSimilarity: ${similarity.toFixed(1)}% (Required: ${threshold.toFixed(1)}%)`);
            }
          } catch (verificationError) {
            console.error('❌ Pure JS face verification error:', verificationError);
            throw verificationError;
          }
        }
      });

      if (captureResult.isConfirmed && captureResult.value?.success) {
        const similarity = captureResult.value.verification.similarity * 100;

        await Swal.fire({
          icon: 'success',
          title: 'Identity Verified & Vote Cast!',
          html: `
            <div style="text-align: center;">
              <p>Your identity has been verified successfully!</p>
              <p style="font-size: 0.9em; color: #28a745;">
                <strong>Similarity Score:</strong> ${similarity.toFixed(1)}%
              </p>
              <p style="font-size: 0.9em; color: #666;">
                Your vote for <strong>${candidate.user?.firstName} ${candidate.user?.lastName}</strong> has been recorded securely.
              </p>
              <p style="font-size: 0.9em; color: #28a745;">📧 A confirmation email has been sent to your registered email.</p>
            </div>
          `,
          timer: 5000,
          showConfirmButton: false,
          background: '#d4edda',
          color: '#155724'
        });

        // ✅ Reload to refresh UI state from server
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Error during Pure JS verification/voting:', error);
      handleVotingError(error);
    } finally {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleVotingError = (err) => {
    console.error('❌ Voting error:', err);

    let errorMessage = 'Failed to submit vote. ';
    let errorTitle = 'Voting Failed';

    if (err.message?.includes('Face verification failed') ||
        err.message?.includes('Identity Verification Failed') ||
        err.message?.includes('This does not appear to be the same person')) {
      errorTitle = 'Identity Verification Failed';
      const similarityMatch = err.message.match(/Similarity:\s*([\d.]+)%/);
      const thresholdMatch = err.message.match(/Required:\s*([\d.]+)%/);
      const lines = err.message.split('\n');
      errorMessage = lines[0];
      if (similarityMatch && thresholdMatch) {
        errorMessage += `<br><br><strong>Similarity Score: ${similarityMatch[1]}% (Required: ${thresholdMatch[1]}%)</strong>`;
      }
    } else if (err.message?.includes('already voted') || err.response?.data?.message?.includes('already voted')) {
      // ✅ FIX: Handle already voted error gracefully
      errorTitle = 'Already Voted';
      errorMessage = 'You have already voted in this election.';
      setHasVoted(true);
    } else if (err.response?.status === 400) {
      errorMessage += err.response.data?.message || 'Invalid request.';
      // ✅ If already voted error from server, update UI
      if (err.response.data?.message?.toLowerCase().includes('already voted')) {
        setHasVoted(true);
      }
    } else if (err.response?.status === 401) {
      errorMessage += 'Please log in again.';
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-id');
      navigate('/login');
      return;
    } else if (err.response?.status === 403) {
      errorMessage += 'You are not allowed to vote in this election.';
    } else if (err.name === 'NotAllowedError') {
      errorMessage = 'Camera access denied. Please allow camera access to vote.';
    } else if (err.name === 'NotFoundError') {
      errorMessage = 'No camera found. Please check your device has a working camera.';
    } else if (err.message?.includes('timeout')) {
      errorMessage = 'Verification timed out. Please try again with better lighting.';
    } else {
      errorMessage = err.message || 'Please try again.';
    }

    Swal.fire({
      icon: 'error',
      title: errorTitle,
      html: `<div style="text-align: center;"><p>${errorMessage}</p></div>`,
      confirmButtonText: 'OK',
      confirmButtonColor: '#dc3545'
    });
  };

  const handleFaceRegistrationComplete = () => {
    setShowFaceRegistration(false);
    if (pendingVote) {
      setTimeout(() => {
        handleVote(pendingVote.candidate, pendingVote.candidateId);
      }, 1000);
      setPendingVote(null);
    }
  };

  const handleFaceRegistrationCancel = () => {
    setShowFaceRegistration(false);
    setPendingVote(null);
    Swal.fire({
      icon: 'info',
      title: 'Registration Cancelled',
      text: 'Face registration was cancelled. You need to complete face registration to vote.',
      confirmButtonText: 'OK'
    });
  };

  if (loading) {
    return (
      <div className="election-loading">
        <div className="loading-spinner"></div>
        <p>Loading election details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="election-error">
        <h3>Error Loading Election</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="election-error">
        <h3>Election Not Found</h3>
        <p>The election you're looking for doesn't exist.</p>
      </div>
    );
  }

  const handleRowClick = (candidateId) => {
    navigate(`/candidate/${candidateId}`);
  };

  return (
    <div className={`election-details-container ${theme}`}>
      <div className="election-header">
        <h2 className={`election-title ${theme}`}>{election.name || 'Unnamed Election'}</h2>
        <div className="election-meta">
          <div className="meta-item"><strong>Date:</strong> {formatDate(election.date)}</div>
          <div className="meta-item"><strong>Location:</strong> {election.location || election.where || 'Not specified'}</div>
        </div>
      </div>

      <div className={`election-status-card ${electionStatus}`}>
        <div className="status-header">
          <h3>Election Status</h3>
          <span className={`status-badge ${electionStatus}`}>
            {electionStatus === 'active' ? '🔴 Live' :
             electionStatus === 'upcoming' ? '🟡 Upcoming' : '🔴 Ended'}
          </span>
        </div>
        <div className="status-details">
          <div className="time-detail"><strong>Start:</strong> {formatDateTime(election.date, election.startTime)}</div>
          <div className="time-detail"><strong>End:</strong> {formatDateTime(election.date, election.endTime)}</div>
          <div className="countdown-detail"><strong>Status:</strong> <span className="countdown-text">{countdown}</span></div>
        </div>
      </div>

      <div className="election-info">
        <div className="info-section">
          <h3>📋 Description</h3>
          <div className={`election-description ${theme}`}>{election.description || 'No description provided.'}</div>
        </div>
        <div className="info-section">
          <h3>📜 Rules & Guidelines</h3>
          <div className={`election-description ${theme}`}>{election.rules || 'No specific rules provided.'}</div>
        </div>
      </div>

      <div className="candidates-section">
        <h3 className={`candidates-title ${theme}`}>
          👥 Candidates ({election.candidates ? election.candidates.length : 0})
        </h3>

        {election.candidates && election.candidates.length > 0 ? (
          <div className="candidates-table-container">
            <table className={`candidates-table ${theme}`}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Photo</th>
                  <th>Candidate Details</th>
                  <th>Verification</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {election.candidates.map((candidate, index) => {
                  // ✅ FIX: Compare as strings to avoid object vs string mismatch
                  const isThisVoted = votedCandidateId &&
                    candidate._id.toString() === votedCandidateId.toString();

                  return (
                    <tr key={candidate._id} className="candidate-row">
                      <td className="candidate-index" onClick={() => handleRowClick(candidate._id)}>
                        {index + 1}
                      </td>
                      <td className="candidate-photo" onClick={() => handleRowClick(candidate._id)}>
                        <img
                          className='profile'
                          src={candidate.user?.profilePhoto || '/default-profile.png'}
                          alt={`${candidate.user?.firstName} ${candidate.user?.lastName}`}
                          onError={(e) => { e.target.src = '/default-profile.png'; }}
                        />
                      </td>
                      <td className="candidate-info" onClick={() => handleRowClick(candidate._id)}>
                        <div className="candidate-name">
                          {candidate.user?.firstName} {candidate.user?.lastName}
                        </div>
                        {candidate.party && (
                          <div className="candidate-party">{candidate.party.name}</div>
                        )}
                        {candidate.bio && (
                          <div className="candidate-bio">
                            {candidate.bio.length > 100 ? `${candidate.bio.substring(0, 100)}...` : candidate.bio}
                          </div>
                        )}
                      </td>
                      <td className="verification-cell">
                        <span className={`verification-status ${candidate.isVerified ? 'verified' : 'pending'}`}>
                          {candidate.isVerified ? '✅ Verified' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="vote-cell">
                        <div className="vote-action">
                          {/* ✅ FIX: Show voted badge if user has voted (any candidate) */}
                          {hasVoted ? (
                            <div className="voted-badge">
                              {isThisVoted ? '✅ Your Vote' : '🔒 Voted'}
                            </div>
                          ) : electionStatus === 'active' ? (
                            <div
                              className={`voteee ${isCheckingFace ? 'disabled' : ''}`}
                              onClick={(e) => {
                                if (isCheckingFace) return;
                                e.stopPropagation();
                                handleVote(candidate, candidate._id);
                              }}
                              title={isCheckingFace ? 'Checking face registration...' : 'Vote for this candidate'}
                            >
                              <img src={vote} alt="Vote" />
                              <span>{isCheckingFace ? 'Checking...' : 'Vote'}</span>
                            </div>
                          ) : (
                            <div className="vote-disabled" title={`Voting is ${electionStatus}`}>
                              <img src={vote} alt="Vote" style={{ opacity: 0.3 }} />
                              <span>Vote</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-candidates">
            <p>No candidates have registered for this election yet.</p>
          </div>
        )}
      </div>

      {electionStatus === 'active' && !hasVoted && (
        <div className="voting-instructions">
          <h4>🗳️ How to Vote:</h4>
          <ol>
            <li>Click the vote button next to your chosen candidate</li>
            <li>Complete face verification for security</li>
            <li>Confirm your vote — this action cannot be undone</li>
          </ol>
        </div>
      )}

      {hasVoted && (
        <div className="voted-message">
          <h4>✅ Vote Submitted</h4>
          <p>Thank you for voting! Your vote has been recorded successfully. A confirmation email has been sent to your registered email address.</p>
        </div>
      )}

      {showFaceRegistration && (
        <div className="face-registration-modal">
          <div className="modal-backdrop" onClick={handleFaceRegistrationCancel}></div>
          <div className="modal-content">
            <FaceRegistration
              onRegistrationComplete={handleFaceRegistrationComplete}
              onCancel={handleFaceRegistrationCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectionDetails;