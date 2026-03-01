import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_ENDPOINTS } from '../../config/api';
import { useTheme } from '../../Context/ThemeContext';
import './AdminStyles.css';

const CreateParty = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    foundingDate: '',
    headquarters: JSON.stringify({
      addressLine1: '',
      addressLine2: '',
      city: '',
      district: '',
      province: ''
    }),
    contactDetails: JSON.stringify({
      email: '',
      phone: ''
    }),
    website: '',
    leader: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setLogoFile(file);
    }
  };

  const handleHeadquartersChange = (field, value) => {
    const headquarters = JSON.parse(formData.headquarters);
    headquarters[field] = value;
    setFormData(prev => ({
      ...prev,
      headquarters: JSON.stringify(headquarters)
    }));
  };

  const handleContactChange = (field, value) => {
    const contactDetails = JSON.parse(formData.contactDetails);
    contactDetails[field] = value;
    setFormData(prev => ({
      ...prev,
      contactDetails: JSON.stringify(contactDetails)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get current values from parsed JSON for validation
    const headquarters = JSON.parse(formData.headquarters);
    const contactDetails = JSON.parse(formData.contactDetails);

    // Validate required fields (logo is now optional)
    if (!formData.name || !formData.abbreviation || !formData.foundingDate) {
      toast.error('Please fill all required fields: Name, Abbreviation, and Founding Date');
      return;
    }

    // Validate headquarters fields
    if (!headquarters.addressLine1 || !headquarters.city || 
        !headquarters.district || !headquarters.province) {
      toast.error('Please fill all headquarters fields: Address Line 1, City, District, and Province');
      return;
    }

    // Validate contact details
    if (!contactDetails.email || !contactDetails.phone) {
      toast.error('Please fill all contact details: Email and Phone');
      return;
    }

    setLoading(true);

    try {
      // Use FormData for file upload (logo is optional)
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('abbreviation', formData.abbreviation);
      submitData.append('foundingDate', formData.foundingDate);
      submitData.append('headquarters', formData.headquarters);
      submitData.append('contactDetails', formData.contactDetails);
      
      if (formData.website) submitData.append('website', formData.website);
      if (formData.leader && formData.leader.trim() !== '') {
        submitData.append('leader', formData.leader);
      }
      
      // Append logo file if provided (optional)
      if (logoFile) {
        submitData.append('logo', logoFile);
      }

      const response = await axios.post(API_ENDPOINTS.PARTIES, submitData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Political party created successfully!');
        // Reset form
        setFormData({
          name: '',
          abbreviation: '',
          foundingDate: '',
          headquarters: JSON.stringify({
            addressLine1: '',
            addressLine2: '',
            city: '',
            district: '',
            province: ''
          }),
          contactDetails: JSON.stringify({
            email: '',
            phone: ''
          }),
          website: '',
          leader: ''
        });
        setLogoFile(null);
        // Clear file input
        if (document.getElementById('logoFile')) {
          document.getElementById('logoFile').value = '';
        }
        
        setTimeout(() => {
          navigate('/admin/parties');
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating party:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create political party';
      const detailedErrors = error.response?.data?.errors;
      
      if (detailedErrors) {
        detailedErrors.forEach(err => toast.error(err));
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const headquarters = JSON.parse(formData.headquarters);
  const contactDetails = JSON.parse(formData.contactDetails);

  const provinces = [
    "Western", "Central", "Southern", "Northern", "Eastern",
    "North Western", "North Central", "Uva", "Sabaragamuwa"
  ];

  return (
    <div className={`admin-container ${theme}`}>
      <ToastContainer />
      
      <div className="admin-header">
        <h1>Create New Political Party</h1>
        <p>Register a new political party in the system</p>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        {/* Logo Upload - OPTIONAL */}
        <div className="form-group">
          <label>Party Logo (Optional)</label>
          <input
            id="logoFile"
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
          />
          <small>Upload party logo (optional, max 5MB, image files only)</small>
          {logoFile && (
            <div style={{marginTop: '10px'}}>
              <img 
                src={URL.createObjectURL(logoFile)} 
                alt="Preview" 
                style={{maxWidth: '100px', maxHeight: '100px'}}
              />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Party Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter party name"
              required
            />
          </div>

          <div className="form-group">
            <label>Abbreviation *</label>
            <input
              type="text"
              name="abbreviation"
              value={formData.abbreviation}
              onChange={handleChange}
              placeholder="e.g., UNP, SLPP"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Founding Date *</label>
          <input
            type="date"
            name="foundingDate"
            value={formData.foundingDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-section">
          <h3>Headquarters Address *</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Address Line 1 *</label>
              <input
                type="text"
                value={headquarters.addressLine1}
                onChange={(e) => handleHeadquartersChange('addressLine1', e.target.value)}
                placeholder="Street address"
                required
              />
            </div>

            <div className="form-group">
              <label>Address Line 2</label>
              <input
                type="text"
                value={headquarters.addressLine2}
                onChange={(e) => handleHeadquartersChange('addressLine2', e.target.value)}
                placeholder="Apartment, suite, etc."
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                value={headquarters.city}
                onChange={(e) => handleHeadquartersChange('city', e.target.value)}
                placeholder="City"
                required
              />
            </div>

            <div className="form-group">
              <label>District *</label>
              <input
                type="text"
                value={headquarters.district}
                onChange={(e) => handleHeadquartersChange('district', e.target.value)}
                placeholder="District"
                required
              />
            </div>

            <div className="form-group">
              <label>Province *</label>
              <select
                value={headquarters.province}
                onChange={(e) => handleHeadquartersChange('province', e.target.value)}
                required
              >
                <option value="">Select Province</option>
                {provinces.map(province => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Contact Details *</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={contactDetails.email}
                onChange={(e) => handleContactChange('email', e.target.value)}
                placeholder="party@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                value={contactDetails.phone}
                onChange={(e) => handleContactChange('phone', e.target.value)}
                placeholder="+94 XX XXX XXXX"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Website</label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://example.com"
          />
        </div>

        <div className="form-group">
          <label>Party Leader (Optional)</label>
          <input
            type="text"
            name="leader"
            value={formData.leader}
            onChange={handleChange}
            placeholder="Enter valid Candidate MongoDB ID"
          />
          <small>Leave empty if no leader assigned yet. Must be a valid 24-character hexadecimal ID.</small>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Creating Party...' : 'Create Political Party'}
          </button>
          
          <button 
            type="button" 
            onClick={() => navigate('/admin/parties')}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateParty;