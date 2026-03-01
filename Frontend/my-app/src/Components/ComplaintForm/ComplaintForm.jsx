import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useParams } from 'react-router-dom';
import './ComplaintForm.css';
import { useTheme } from '../../Context/ThemeContext';
import { API_ENDPOINTS } from '../../config/api';

const ComplaintForm = () => {
  const { theme } = useTheme();
  const { id } = useParams(); // This might be candidate ID if coming from candidate profile
  const userId = localStorage.getItem('user-id');
  const [candidates, setCandidates] = useState([]);
  const [candidate, setCandidate] = useState(id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.CANDIDATES);
        setCandidates(response.data.data || []);
      } catch (error) {
        console.error('Error fetching candidates:', error);
        Swal.fire('Error', 'Failed to fetch candidates', 'error');
      }
    };

    fetchCandidates();
  }, []);

  const handleProofsChange = (e) => {
    setProofs([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!userId) {
      Swal.fire('Error', 'User not authenticated', 'error');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('user', userId);
    formData.append('candidate', candidate);
    formData.append('title', title);
    formData.append('description', description);
    proofs.forEach(file => formData.append('proofs', file));

    try {
      const response = await axios.post(API_ENDPOINTS.COMPLAINTS, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Complaint submitted successfully',
          timer: 3000,
          showConfirmButton: false
        });
        // Reset form
        setCandidate(id || '');
        setTitle('');
        setDescription('');
        setProofs([]);
      } else {
        Swal.fire('Error', response.data.message || 'Failed to submit complaint', 'error');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to submit complaint', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`complaint-form-container ${theme}`}>
      <div className="complaint-form-header">
        <h2>Submit a Complaint</h2>
        <p>Report any misconduct or violations by candidates</p>
      </div>

      <form onSubmit={handleSubmit} className="complaint-form">
        <div className="form-group">
          <label htmlFor="candidate">Candidate *</label>
          <select
            id="candidate"
            value={candidate}
            onChange={(e) => setCandidate(e.target.value)}
            required
            disabled={!!id} // Disable if candidate ID is provided in URL
          >
            <option value="">Select a candidate</option>
            {candidates.map((cand) => (
              <option key={cand._id} value={cand._id}>
                 {cand?.user?.firstName && cand?.user?.lastName
                  ? `${cand.user.firstName} ${cand.user.lastName}`
                  : 'Unknown Candidate'}
              </option>
            ))}
          </select>
          {id && <small>Candidate is pre-selected from the profile page</small>}
        </div>

        <div className="form-group">
          <label htmlFor="title">Complaint Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a clear and concise title for your complaint"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Complaint Description *</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide detailed information about your complaint. Include dates, locations, and specific incidents."
            rows="6"
            required
          ></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="proofs">Supporting Evidence</label>
          <input
            id="proofs"
            type="file"
            multiple
            onChange={handleProofsChange}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <small>You can upload multiple files (images, documents, PDFs). Maximum 5 files.</small>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </div>

        <div className="form-note">
          <p><strong>Note:</strong> All complaints are reviewed by our administration team.
          False complaints may result in account suspension.</p>
        </div>
      </form>
    </div>
  );
};

export default ComplaintForm;