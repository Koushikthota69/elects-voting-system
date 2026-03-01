import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ElectionDetailsProvincial.css';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import vote from '../Assests/online-voting.png';
import { useTheme } from '../../Context/ThemeContext';
import { API_ENDPOINTS } from '../../config/api';
import FaceRegistration from '../FaceRegistration/FaceRegistration';

const ElectionDetailsProvincial = () => {
  const { theme } = useTheme();
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [votedCandidateId, setVotedCandidateId] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [electionStatus, setElectionStatus] = useState('');
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [pendingVote, setPendingVote] = useState(null);
  const [isCheckingFace, setIsCheckingFace] = useState(false);
  const navigate = useNavigate();
  const [voter, setVoter] = useState(null);
  const [isEligible, setIsEligible] = useState(false);

  const userId = localStorage.getItem('user-id');

  // ✅ Enhanced date parsing
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

        const startDateTimeStr = `${datePart}T${startTimeFormatted}`;
        const endDateTimeStr = `${datePart}T${endTimeFormatted}`;

        startTime = new Date(startDateTimeStr);
        endTime = new Date(endDateTimeStr);
      }
      else if (electionData.startTime && electionData.endTime) {
        startTime = new Date(electionData.startTime);
        endTime = new Date(electionData.endTime);
      }
      else {
        startTime = new Date(Date.now() + 60 * 60 * 1000);
        endTime = new Date(Date.now() + 13 * 60 * 60 * 1000);
      }

      if (isNaN(startTime.getTime())) {
        startTime = new Date(Date.now() + 60 * 60 * 1000);
      }
      if (isNaN(endTime.getTime())) {
        endTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000);
      }

      return { startTime, endTime };
    } catch (error) {
      console.error('❌ Date parsing error:', error);
      const defaultStart = new Date(Date.now() + 60 * 60 * 1000);
      const defaultEnd = new Date(defaultStart.getTime() + 12 * 60 * 60 * 1000);
      return { startTime: defaultStart, endTime: defaultEnd };
    }
  };

  // ✅ IMPROVED: Check face registration status with better error handling
  const checkFaceRegistrationStatus = async () => {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.log('❌ No auth token found');
      return false;
    }

    setIsCheckingFace(true);

    try {
      const response = await axios.get(API_ENDPOINTS.FACE_STATUS, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
        console.warn('⚠️ Face service unavailable, allowing vote without verification for demo');
        return true;
      }

      return false;
    } finally {
      setIsCheckingFace(false);
    }
  };

  // ✅ FIXED: Extract fetchElectionData to be reusable
  const fetchElectionData = async () => {
    try {
      console.log('🔍 Fetching provincial election data for ID:', id);

      const [electionResponse, candidatesResponse] = await Promise.all([
        axios.get(API_ENDPOINTS.PROVINCIAL_ELECTION_DETAILS(id)),
        axios.get(API_ENDPOINTS.CANDIDATES)
      ]);

      const electionData = electionResponse.data.data;
      console.log('📊 Provincial election data:', electionData);

      if (!electionData) {
        throw new Error('Election data not found');
      }

      setElection(electionData);
      const candidatesData = candidatesResponse.data.data || [];
      setCandidates(candidatesData);

      // Check if user has voted
      const userId = localStorage.getItem('user-id');
      if (userId && electionData.results && electionData.results.voteDistribution) {
        const votedCandidate = electionData.results.voteDistribution.find(candidate =>
          candidate.voters && candidate.voters.includes(userId)
        );
        if (votedCandidate) {
          setVotedCandidateId(votedCandidate.candidate);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching provincial election data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load election data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElectionData();
  }, [id]);

  useEffect(() => {
    const fetchVoterDetails = async () => {
      if (!userId || !election) return;

      try {
        const response = await axios.get(API_ENDPOINTS.USER_PROFILE(userId));
        setVoter(response.data);

        let userProvince = response.data.province;
        // Remove "Province" from userProvince
        userProvince = userProvince?.replace(" Province", "")?.trim() || '';

        // Check eligibility
        if (userProvince === election.province) {
          setIsEligible(true);
          console.log('✅ User is eligible to vote in this province');
        } else {
          console.log('❌ User is NOT eligible - User province:', userProvince, 'Election province:', election.province);
        }
      } catch (error) {
        console.error('Error fetching voter details:', error);
      }
    };

    if (election) {
      fetchVoterDetails();
    }
  }, [userId, election]);

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

        if (days > 0) {
          setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else {
          setCountdown(`${hours}h ${minutes}m ${seconds}s`);
        }
      } else if (now >= startTime && now <= endTime) {
        setElectionStatus('active');
        const timeRemaining = endTime - now;
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        setCountdown(`🟢 Live - ${hours}h ${minutes}m ${seconds}s left`);
      } else {
        setElectionStatus('ended');
        setCountdown('🔴 Election Ended');
      }
    };

    updateElectionStatus();
    const interval = setInterval(updateElectionStatus, 1000);
    return () => clearInterval(interval);
  }, [election]);

  // Format functions
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not set';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Date not set' : date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Date not set';
    }
  };

  const formatDateTime = (dateString, timeString) => {
    try {
      const { startTime } = parseElectionDateTime({ date: dateString, startTime: timeString });
      if (isNaN(startTime.getTime())) return 'Date/Time not set';
      return startTime.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Date/Time not set';
    }
  };

  // ✅ IMPROVED: Enhanced voting function with eligibility check and better face verification
  const handleVote = async (candidate, candidateId) => {
    console.log('🗳️ Attempting to vote for provincial candidate:', candidateId);

    // Check eligibility first
    if (!isEligible) {
      Swal.fire({
        icon: 'error',
        title: 'Not Eligible',
        html: `
          <div style="text-align: center;">
            <p>You are not eligible to vote in this provincial election.</p>
            <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
              <strong>Your Province:</strong> ${voter?.province || 'Not available'}<br/>
              <strong>Election Province:</strong> ${election.province}
            </p>
            <p style="margin-top: 15px; font-size: 0.9em;">
              You can only vote in provincial elections for your registered province.
            </p>
          </div>
        `,
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    const { startTime, endTime } = parseElectionDateTime(election);
    const now = new Date();

    if (electionStatus === 'upcoming') {
      Swal.fire({
        icon: 'error',
        title: 'Voting Not Started',
        text: `Voting starts on ${formatDateTime(election.date, election.startTime)}`
      });
      return;
    }

    if (electionStatus === 'ended') {
      Swal.fire({
        icon: 'error',
        title: 'Voting Ended',
        text: `Voting ended on ${formatDateTime(election.date, election.endTime)}`
      });
      return;
    }

    if (votedCandidateId) {
      Swal.fire({
        icon: 'error',
        title: 'Already Voted',
        text: 'You have already voted in this election!'
      });
      return;
    }

    if (!candidate.isVerified) {
      Swal.fire({
        icon: 'error',
        title: 'Candidate Not Verified',
        text: 'This candidate is not verified and cannot receive votes.'
      });
      return;
    }

    const token = localStorage.getItem('auth-token');
    const userId = localStorage.getItem('user-id');

    if (!token || !userId) {
      Swal.fire({
        icon: 'error',
        title: 'Login Required',
        text: 'Please log in to vote.'
      });
      navigate('/login');
      return;
    }

    // Confirmation dialog
    const result = await Swal.fire({
      title: 'Confirm Your Vote',
      html: `
        <div style="text-align: center;">
          <p>You are about to vote for:</p>
          <p style="font-size: 1.2em; font-weight: bold; color: #007bff; margin: 10px 0;">
            ${candidate.user?.firstName} ${candidate.user?.lastName}
          </p>
          <p style="color: #28a745; font-size: 0.9em;">
            <strong>Province:</strong> ${election.province}
          </p>
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
      // Check face registration status first
      const isFaceRegistered = await checkFaceRegistrationStatus();

      if (!isFaceRegistered) {
        // Store the pending vote and show face registration modal
        setPendingVote({ candidate, candidateId });
        setShowFaceRegistration(true);
        return;
      }

      // If face is registered, proceed with camera access for verification
      await proceedWithVote(candidate, candidateId, token, userId);
    } catch (err) {
      console.error('❌ Initial voting error:', err);
      handleVotingError(err);
    }
  };

  // ✅ ADVANCED: Enhanced vote proceeding with PURE JS face verification
  const proceedWithVote = async (candidate, candidateId, token, userId) => {
    let videoStream = null;

    try {
      // Request camera access
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
          facingMode: 'user'
        }
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
              Ensure:<br>
              • Good lighting<br>
              • Face clearly visible<br>
              • Look directly at camera<br>
              • No glasses/coverings
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
            // Show verifying message
            Swal.fire({
              title: 'Verifying Identity...',
              html: `
                <div style="text-align: center;">
                  <p>Comparing with your registered photo using advanced AI...</p>
                  <div class="loading-spinner" style="margin: 20px auto;"></div>
                  <p style="font-size: 0.9em; color: #666;">Pure JavaScript face verification in progress</p>
                </div>
              `,
              allowOutsideClick: false,
              didOpen: () => { Swal.showLoading(); }
            });

            // Capture high-quality photo
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

            // Face verification with timeout for advanced processing
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
              // Submit vote
              console.log('🗳️ Submitting vote after successful verification...');

              const voteResponse = await axios.post(
                API_ENDPOINTS.VOTE_PROVINCIAL_ELECTION(election._id, candidateId),
                {
                  voterId: userId,
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

              setVotedCandidateId(candidateId);
              return {
                success: true,
                data: voteResponse.data,
                verification: verificationResponse.data
              };
            } else {
              // Enhanced error message with similarity score for Pure JS backend
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
              <p style="font-size: 0.9em; color: #28a745;">
                <strong>Confidence:</strong> ${captureResult.value.verification.confidence || 'HIGH'}
              </p>
              <p style="font-size: 0.9em; color: #666;">
                Your vote for <strong>${candidate.user?.firstName} ${candidate.user?.lastName}</strong> has been recorded securely.
              </p>
            </div>
          `,
          timer: 5000,
          showConfirmButton: false,
          background: '#d4edda',
          color: '#155724'
        });

        // Refresh page to update UI
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Error during Pure JS verification/voting:', error);
      handleVotingError(error);
    } finally {
      // Stop camera
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    }
  };

  // ✅ FIXED: Better error handling that properly detects "already voted"
  const handleVotingError = async (err) => {
    console.error('❌ Voting error:', err);

    let errorMessage = 'Failed to submit vote. ';
    let errorTitle = 'Voting Failed';

    // ✅ FIXED: Properly detect "already voted" from 400 response
    if (err.response?.status === 400) {
      const responseMessage = err.response.data?.message?.toLowerCase() || '';

      if (responseMessage.includes('already voted') ||
          responseMessage.includes('already cast') ||
          responseMessage.includes('voted already')) {

        errorTitle = 'Already Voted';
        errorMessage = 'You have already voted in this election!';

        // Update local state to reflect that user has voted
        setVotedCandidateId(true);

        // Refresh election data to get updated vote status
        await fetchElectionData();

      } else {
        errorMessage += err.response.data.message || 'Invalid request.';
      }
    }
    // Enhanced error parsing for Pure JS backend responses
    else if (err.message?.includes('Face verification failed') ||
        err.message?.includes('Identity Verification Failed') ||
        err.message?.includes('This does not appear to be the same person')) {

      errorTitle = 'Identity Verification Failed';

      // Extract similarity and threshold using regex for better accuracy
      const similarityMatch = err.message.match(/Similarity:\s*([\d.]+)%/);
      const thresholdMatch = err.message.match(/Required:\s*([\d.]+)%/);

      // Main error message
      const lines = err.message.split('\n');
      errorMessage = lines[0]; // Main error message

      // Add similarity details if available
      if (similarityMatch && thresholdMatch) {
        errorMessage += `<br><br><strong>Similarity Score: ${similarityMatch[1]}% (Required: ${thresholdMatch[1]}%)</strong>`;
      }

      // Add specific suggestions based on error type
      if (err.message.includes('This does not appear to be the same person')) {
        errorMessage += `<br><br><strong>Security Alert:</strong> This does not match the registered person.<br>
                         Please use the same person who completed face registration.`;
      } else {
        errorMessage += `<br><br><strong>Tips for better verification:</strong><br>
                         • Ensure good lighting conditions<br>
                         • Look directly at the camera<br>
                         • Use the same person who registered<br>
                         • Remove glasses/face coverings<br>
                         • Ensure your entire face is visible`;
      }
    } else if (err.message?.includes('Face registration')) {
      errorTitle = 'Registration Required';
      errorMessage = err.message;
    } else if (err.response?.status === 401) {
      errorMessage += 'Please log in again.';
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-id');
      navigate('/login');
      return;
    } else if (err.response?.status === 403) {
      errorMessage += 'You are not allowed to vote in this election.';
    } else if (err.response?.status === 409) {
      errorTitle = 'Already Voted';
      errorMessage = 'You have already voted in this election!';
      setVotedCandidateId(true);
      await fetchElectionData();
    } else if (err.message?.includes('Network Error') || err.code === 'NETWORK_ERROR') {
      errorMessage += 'Network error. Please check your connection.';
    } else if (err.name === 'NotAllowedError') {
      errorMessage = 'Camera access denied. Please allow camera access to vote.';
    } else if (err.name === 'NotFoundError') {
      errorMessage = 'No camera found. Please check your device has a working camera.';
    } else if (err.name === 'NotSupportedError') {
      errorMessage = 'Camera not supported in your browser.';
    } else if (err.message?.includes('timeout')) {
      errorMessage = 'Verification process took too long. Please try again with better lighting and ensure your face is clearly visible.';
    } else {
      errorMessage = err.message || 'Please try again.';
    }

    Swal.fire({
      icon: 'error',
      title: errorTitle,
      html: `
        <div style="text-align: center;">
          <p>${errorMessage}</p>
          <p style="margin-top: 15px; font-size: 0.9em; color: #666;">
            If this continues, please contact support.
          </p>
        </div>
      `,
      confirmButtonText: 'OK',
      confirmButtonColor: '#dc3545'
    });
  };

  // Handle face registration completion
  const handleFaceRegistrationComplete = () => {
    setShowFaceRegistration(false);
    if (pendingVote) {
      // Retry voting after successful registration
      setTimeout(() => {
        handleVote(pendingVote.candidate, pendingVote.candidateId);
      }, 1000);
      setPendingVote(null);
    }
  };

  // Handle face registration cancellation
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
        <p>Loading provincial election details...</p>
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
        <p>The provincial election you're looking for doesn't exist.</p>
      </div>
    );
  }

  const handleRowClick = (candidateId) => {
    navigate(`/candidate/${candidateId}`);
  };

  return (
    <div className={`election-details-container ${theme}`}>
      {/* Election Header */}
      <div className="election-header">
        <h2 className={`election-title ${theme}`}>Provincial Council Election - {election.year}</h2>
        <div className="election-meta">
          <div className="meta-item">
            <strong>Date:</strong> {formatDate(election.date)}
          </div>
          <div className="meta-item">
            <strong>Province:</strong> {election.province}
          </div>
          <div className="meta-item eligibility-status">
            <strong>Your Status:</strong>
            <span className={isEligible ? 'eligible' : 'not-eligible'}>
              {isEligible ? '✅ Eligible' : '❌ Not Eligible'}
            </span>
          </div>
        </div>
      </div>

      {/* Election Status Card */}
      <div className={`election-status-card ${electionStatus}`}>
        <div className="status-header">
          <h3>Election Status</h3>
          <span className={`status-badge ${electionStatus}`}>
            {electionStatus === 'active' ? '🟢 Live' :
             electionStatus === 'upcoming' ? '🟡 Upcoming' : '🔴 Ended'}
          </span>
        </div>
        <div className="status-details">
          <div className="time-detail">
            <strong>Start:</strong> {formatDateTime(election.date, election.startTime)}
          </div>
          <div className="time-detail">
            <strong>End:</strong> {formatDateTime(election.date, election.endTime)}
          </div>
          <div className="countdown-detail">
            <strong>Status:</strong> <span className="countdown-text">{countdown}</span>
          </div>
        </div>
      </div>

      {/* Election Information */}
      <div className="election-info">
        <div className="info-section">
          <h3>📋 Description</h3>
          <div className={`election-description ${theme}`}>
            {election.description || 'No description provided.'}
          </div>
        </div>

        <div className="info-section">
          <h3>📜 Rules & Guidelines</h3>
          <div className={`election-description ${theme}`}>
            {election.rules || 'No specific rules provided.'}
          </div>
        </div>
      </div>

      {/* Eligibility Notice */}
      {!isEligible && (
        <div className="eligibility-notice">
          <h4>⚠️ Eligibility Notice</h4>
          <p>
            You are not eligible to vote in this provincial election.
            Provincial elections are restricted to voters registered in the specific province.
          </p>
          <p>
            <strong>Your Province:</strong> {voter?.province || 'Not available'}<br/>
            <strong>Election Province:</strong> {election.province}
          </p>
        </div>
      )}

      {/* Candidates Section */}
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
                {election.candidates.map((candidate, index) => (
                  <tr key={candidate._id} className="candidate-row">
                    <td className="candidate-index" onClick={() => handleRowClick(candidate.user._id)}>
                      {index + 1}
                    </td>
                    <td className="candidate-photo" onClick={() => handleRowClick(candidate.user._id)}>
                      <img
                        className='profile'
                        src={candidate.user.profilePhoto || '/default-profile.png'}
                        alt={`${candidate.user.firstName} ${candidate.user.lastName}`}
                        onError={(e) => {
                          e.target.src = '/default-profile.png';
                        }}
                      />
                    </td>
                    <td className="candidate-info" onClick={() => handleRowClick(candidate.user._id)}>
                      <div className="candidate-name">
                        {candidate.user.firstName} {candidate.user.lastName}
                      </div>
                      {candidate.party && (
                        <div className="candidate-party">
                          {candidate.party.name}
                        </div>
                      )}
                      {candidate.bio && (
                        <div className="candidate-bio">
                          {candidate.bio.length > 100 ?
                            `${candidate.bio.substring(0, 100)}...` : candidate.bio}
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
                        {votedCandidateId === candidate._id ? (
                          <div className="voted-badge">
                            ✅ Voted
                          </div>
                        ) : electionStatus === 'active' && isEligible ? (
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
                          <div className="vote-disabled" title={!isEligible ? 'Not eligible to vote' : `Voting is ${electionStatus}`}>
                            <img src={vote} alt="Vote" style={{ opacity: 0.3 }} />
                            <span>Vote</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-candidates">
            <p>No candidates have registered for this election yet.</p>
          </div>
        )}
      </div>

      {/* Voting Instructions */}
      {electionStatus === 'active' && !votedCandidateId && isEligible && (
        <div className="voting-instructions">
          <h4>🗳️ How to Vote:</h4>
          <ol>
            <li>Click the vote button next to your chosen candidate</li>
            <li>Complete <strong>advanced face verification</strong> for security</li>
            <li>Confirm your vote (requires 75%+ similarity with registered photo)</li>
          </ol>
          <p><strong>Note:</strong> Uses Pure JavaScript face recognition - no external dependencies required. Make sure you have good lighting and your face is clearly visible.</p>
        </div>
      )}

      {/* Already Voted Message */}
      {votedCandidateId && (
        <div className="voted-message">
          <h4>✅ Vote Submitted</h4>
          <p>Thank you for voting! Your vote has been recorded successfully.</p>
        </div>
      )}

      {/* Face Registration Modal */}
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

export default ElectionDetailsProvincial;