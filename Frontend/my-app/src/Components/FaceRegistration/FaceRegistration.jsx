import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';
import './FaceRegistration.css';

const FaceRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleFaceRegistration = async () => {
    const token = localStorage.getItem('auth-token');
    const userId = localStorage.getItem('user-id');

    if (!token || !userId) {
      Swal.fire({
        icon: 'error',
        title: 'Authentication Required',
        text: 'Please log in to complete face registration.'
      });
      return;
    }

    setLoading(true);

    try {
      // Request camera permission
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
          facingMode: 'user'
        }
      });

      const videoElement = document.createElement('video');
      videoElement.srcObject = videoStream;
      await videoElement.play();

      setStep(2);

      const result = await Swal.fire({
        title: 'Face Registration',
        html: `
          <div style="text-align: center;">
            <p style="margin-bottom: 15px; font-size: 1.1em; color: #d9534f;">
              <strong>IMPORTANT:</strong> Use the same person who will vote
            </p>
            <p style="margin-bottom: 15px; font-size: 1.1em;">
              Please look directly at the camera for face registration
            </p>
            <video id="registration-video" autoplay playsinline style="width: 100%; max-width: 400px; border-radius: 8px; border: 2px solid #007bff;"></video>
            <p style="margin-top: 10px; color: #666; font-size: 0.9em;">
              Ensure good lighting and your face is clearly visible
            </p>
            <p style="margin-top: 5px; color: #ff6b35; font-size: 0.8em;">
              <strong>Note:</strong> This will be compared during voting using Pure JavaScript AI
            </p>
          </div>
        `,
        didOpen: () => {
          const videoFeed = Swal.getHtmlContainer().querySelector('#registration-video');
          videoFeed.srcObject = videoStream;
        },
        showCancelButton: true,
        confirmButtonText: 'Register Face',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#007bff',
        preConfirm: async () => {
          try {
            Swal.fire({
              title: 'Registering Face...',
              html: `
                <div style="text-align: center;">
                  <p>Extracting facial features using Pure JavaScript...</p>
                  <div class="loading-spinner" style="margin: 20px auto;"></div>
                  <p style="font-size: 0.9em; color: #666;">This may take a few moments</p>
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
              canvas.toBlob(resolve, 'image/jpeg', 0.9) // Higher quality for better registration
            );

            const formData = new FormData();
            formData.append('photo', blob, 'registration.jpg');

            console.log('🔍 Starting Pure JS face registration...');

            const response = await axios.post(
              API_ENDPOINTS.FACE_REGISTRATION,
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                  'Authorization': `Bearer ${token}`,
                },
                timeout: 45000 // 45 seconds for Pure JS processing
              }
            );

            console.log('✅ Pure JS face registration result:', response.data);

            if (response.data.success) {
              // Update user's face registration status in localStorage
              const userData = JSON.parse(localStorage.getItem('user-data') || '{}');
              userData.isFaceRegistered = true;
              userData.faceRegisteredAt = new Date().toISOString();
              localStorage.setItem('user-data', JSON.stringify(userData));

              // Also update localStorage with basic flag for quick checks
              localStorage.setItem('user-face-registered', 'true');

              return response.data;
            } else {
              throw new Error(response.data.message || 'Face registration failed');
            }
          } catch (error) {
            console.error('❌ Pure JS face registration error:', error);

            // Enhanced error handling for Pure JS backend
            let errorMsg = error.message;
            if (error.response?.data?.message) {
              errorMsg = error.response.data.message;
            }

            throw new Error(errorMsg);
          } finally {
            // Stop camera
            videoStream.getTracks().forEach(track => track.stop());
          }
        }
      });

      if (result.isConfirmed) {
        await Swal.fire({
          icon: 'success',
          title: 'Face Registered Successfully!',
          html: `
            <div style="text-align: center;">
              <p>Your face has been registered for secure voting.</p>
              <p style="font-size: 0.9em; color: #28a745; margin-top: 10px;">
                <strong>Technology:</strong> Pure JavaScript Face Recognition
              </p>
              <p style="font-size: 0.9em; color: #666; margin-top: 5px;">
                Your facial features have been securely stored and encrypted.
              </p>
            </div>
          `,
          timer: 3000,
          showConfirmButton: false,
          background: '#d4edda',
          color: '#155724'
        });

        // Redirect to home page after successful registration
        navigate('/');
      } else {
        // If cancelled, redirect to home page
        navigate('/');
      }

    } catch (err) {
      console.error('❌ Face registration process error:', err);

      let errorMessage = 'Face registration failed. ';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera access to register your face.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please check your device has a working camera.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data.message || 'Invalid registration request. Please ensure your face is clearly visible.';
      } else if (err.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message?.includes('No face detected')) {
        errorMessage = 'No face detected. Please ensure:\n• Your face is clearly visible\n• Good lighting conditions\n• Facing camera directly\n• No sunglasses or face coverings';
      } else {
        errorMessage = err.message || 'Please try again. Ensure good lighting and clear face visibility.';
      }

      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        html: `
          <div style="text-align: center;">
            <p>${errorMessage}</p>
            <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
              Tips: Use good lighting, look directly at camera, ensure face is clearly visible.
            </p>
          </div>
        `,
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545'
      }).then(() => {
        // Redirect to home page even on failure
        navigate('/');
      });

    } finally {
      setLoading(false);
      setStep(1);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="face-registration-container">
      <div className="registration-content">
        <h3>🔐 Face Registration Required</h3>
        <p>To vote securely, you need to register your face first.</p>
        <p>This ensures that only you can cast your vote using advanced Pure JavaScript face recognition.</p>

        <div className="registration-steps">
          <div className="step">
            <span className="step-number">1</span>
            <span className="step-text">Allow camera access</span>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <span className="step-text">Look directly at camera</span>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <span className="step-text">Capture facial features</span>
          </div>
        </div>

        <div className="tech-info">
          <p><strong>Technology:</strong> Pure JavaScript Face Recognition</p>
          <p><strong>Security:</strong> 75%+ similarity required for voting</p>
          <p><strong>Privacy:</strong> Your data stays secure and encrypted</p>
        </div>

        <div className="registration-actions">
          <button
            onClick={handleFaceRegistration}
            disabled={loading}
            className="register-button"
          >
            {loading ? (
              <>
                <div className="button-spinner"></div>
                Registering...
              </>
            ) : (
              'Register Face Now'
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>

        <div className="privacy-note">
          <p>🔒 Your facial data is encrypted and stored securely. It will only be used for voter verification.</p>
        </div>
      </div>
    </div>
  );
};

export default FaceRegistration;