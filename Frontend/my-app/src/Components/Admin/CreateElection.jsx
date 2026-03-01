import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../config/api';
import 'react-toastify/dist/ReactToastify.css';

const CreateElection = () => {
  const navigate = useNavigate();
  const [electionType, setElectionType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    where: '',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    rules: '',
    year: new Date().getFullYear(),
    province: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔄 Creating election with data:', formData);

      // ✅ Prepare data based on election type
      let endpoint;
      let payload = {
        ...formData,
        electionType
      };

      // Remove unnecessary fields
      if (electionType === 'general') {
        endpoint = API_ENDPOINTS.CREATE_ELECTION;
        delete payload.year;
        delete payload.province;
      } else if (electionType === 'presidential') {
        endpoint = API_ENDPOINTS.CREATE_PRESIDENTIAL_ELECTION;
        payload.name = `Presidential Election ${formData.year}`;
        payload.where = 'Nationwide';
        delete payload.province;
      } else if (electionType === 'parliamentary') {
        endpoint = API_ENDPOINTS.CREATE_PARLIAMENTARY_ELECTION;
        payload.name = `Parliamentary Election ${formData.year}`;
        payload.where = 'Nationwide';
        delete payload.province;
      } else if (electionType === 'provincial') {
        endpoint = API_ENDPOINTS.CREATE_PROVINCIAL_ELECTION;
        payload.name = `${formData.province} Provincial Election ${formData.year}`;
        payload.where = formData.province;
      }

      console.log('📤 Sending to endpoint:', endpoint);
      console.log('📦 Payload:', payload);

      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 10 second timeout
      });

      console.log('✅ Election creation response:', response.data);

      if (response.data.success) {
        toast.success('Election created successfully!');
        // Reset form
        setFormData({
          name: '',
          where: '',
          date: '',
          startTime: '',
          endTime: '',
          description: '',
          rules: '',
          year: new Date().getFullYear(),
          province: ''
        });
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error creating election:', error);

      // ✅ Better error handling
      let errorMessage = 'Failed to create election';

      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message ||
                      error.response.data?.error ||
                      `Server error: ${error.response.status}`;
        console.error('📋 Server error details:', error.response.data);
      } else if (error.request) {
        // Request made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something else happened
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const provinces = [
    "Western Province", "Central Province", "Southern Province", "Northern Province",
    "Eastern Province", "North Western Province", "North Central Province", "Uva Province", "Sabaragamuwa Province"
  ];

  return (
    <div className="create-election">
      <ToastContainer />

      <div className="create-election-header">
        <h1>Create New Election</h1>
        <p>Set up a new election for voting</p>
      </div>

      <form onSubmit={handleSubmit} className="election-form">
        <div className="form-group">
          <label>Election Type *</label>
          <select
            name="electionType"
            value={electionType}
            onChange={(e) => setElectionType(e.target.value)}
            required
          >
            <option value="general">General Election</option>
            <option value="presidential">Presidential Election</option>
            <option value="parliamentary">Parliamentary Election</option>
            <option value="provincial">Provincial Election</option>
          </select>
        </div>

        {/* Show year for specific election types */}
        {(electionType === 'presidential' || electionType === 'parliamentary' || electionType === 'provincial') && (
          <div className="form-group">
            <label>Year *</label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              min="2000"
              max="2030"
              required
            />
          </div>
        )}

        {/* Show name and location for general elections */}
        {electionType === 'general' && (
          <>
            <div className="form-group">
              <label>Election Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter election name"
                required
              />
            </div>

            <div className="form-group">
              <label>Location *</label>
              <input
                type="text"
                name="where"
                value={formData.where}
                onChange={handleChange}
                placeholder="Enter election location"
                required
              />
            </div>
          </>
        )}

        {/* Show province for provincial elections */}
        {electionType === 'provincial' && (
          <div className="form-group">
            <label>Province *</label>
            <select
              name="province"
              value={formData.province}
              onChange={handleChange}
              required
            >
              <option value="">Select Province</option>
              {provinces.map(province => (
                <option key={province} value={province}>{province}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Election Date *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="time-fields">
          <div className="form-group">
            <label>Start Time *</label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>End Time *</label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter election description"
            rows="4"
            required
          />
        </div>

        <div className="form-group">
          <label>Rules & Guidelines</label>
          <textarea
            name="rules"
            value={formData.rules}
            onChange={handleChange}
            placeholder="Enter election rules and guidelines"
            rows="4"
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
            className={`create-button ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Creating Election...
              </>
            ) : (
              'Create Election'
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="cancel-button"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateElection;