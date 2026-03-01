import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_ENDPOINTS } from '../../config/api';
import { useTheme } from '../../Context/ThemeContext';
import './AdminStyles.css';

const PartiesList = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.PARTIES, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      if (response.data.success) {
        setParties(response.data.parties);
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (partyId) => {
    if (!window.confirm('Are you sure you want to delete this party?')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_ENDPOINTS.PARTIES}/${partyId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (response.data.success) {
        toast.success('Party deleted successfully');
        fetchParties(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting party:', error);
      toast.error('Failed to delete party');
    }
  };

  if (loading) {
    return <div className={`admin-container ${theme}`}>Loading parties...</div>;
  }

  return (
    <div className={`admin-container ${theme}`}>
      <ToastContainer />
      
      <div className="admin-header">
        <div className="header-row">
          <h1>Political Parties</h1>
          <button 
            onClick={() => navigate('/admin/create-party')}
            className="create-button"
          >
            Create New Party
          </button>
        </div>
        <p>Manage all political parties in the system</p>
      </div>

      <div className="admin-content">
        {parties.length === 0 ? (
          <div className="empty-state">
            <h3>No parties found</h3>
            <p>Create your first political party to get started</p>
            <button 
              onClick={() => navigate('/admin/create-party')}
              className="create-button"
            >
              Create Party
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Name</th>
                  <th>Abbreviation</th>
                  <th>Founded</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party._id}>
                    <td>
                      {party.logo ? (
                        <img 
                          src={party.logo} 
                          alt={party.name}
                          className="party-logo"
                          style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px'}}
                        />
                      ) : (
                        <div className="no-logo" style={{
                          width: '50px', 
                          height: '50px', 
                          backgroundColor: '#f0f0f0', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          borderRadius: '5px',
                          fontSize: '12px',
                          color: '#666'
                        }}>
                          No Logo
                        </div>
                      )}
                    </td>
                    <td>{party.name}</td>
                    <td>
                      <span className="abbreviation" style={{
                        padding: '4px 8px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}>
                        {party.abbreviation}
                      </span>
                    </td>
                    <td>
                      {party.foundingDate ? new Date(party.foundingDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      <div className="contact-info">
                        <div>{party.contactDetails?.email || 'N/A'}</div>
                        <div>{party.contactDetails?.phone || 'N/A'}</div>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons" style={{display: 'flex', gap: '8px'}}>
                        <button 
                          onClick={() => navigate(`/admin/parties/${party._id}`)}
                          className="edit-button"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(party._id)}
                          className="delete-button"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartiesList;