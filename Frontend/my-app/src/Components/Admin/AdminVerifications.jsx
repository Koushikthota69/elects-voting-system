import React, { useState, useEffect } from 'react';
import { API_BASE, API_ENDPOINTS } from '../../config/api';
import './AdminVerifications.css';

const AdminVerifications = () => {
  const [pendingCandidates, setPendingCandidates] = useState([]);
  const [pendingParties, setPendingParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('candidates');

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      const token = localStorage.getItem('token');

      // ✅ FIXED: Use the correct endpoint
      const candidatesResponse = await fetch(
        API_ENDPOINTS.PENDING_VERIFICATIONS,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (candidatesResponse.ok) {
        const candidatesData = await candidatesResponse.json();
        console.log('Pending candidates:', candidatesData);
        setPendingCandidates(candidatesData.users || candidatesData.data || []);
      } else {
        console.error('Failed to fetch pending candidates:', candidatesResponse.status);
      }

    } catch (error) {
      console.error('Error fetching verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Use the correct ID (user ID instead of candidate ID)
  const handleVerification = async (userId, isVerified) => {
    try {
      const token = localStorage.getItem('token');

      console.log('🔍 Verifying user:', userId, 'Status:', isVerified);

      // ✅ FIXED: Use the correct endpoint with user ID
      const response = await fetch(
        `${API_BASE}/api/v1/candidates/verify/${userId}`, // Use user ID, not candidate ID
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isVerified })
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Verification successful:', result);

        // Remove from pending list
        setPendingCandidates(prev =>
          prev.filter(candidate => candidate.user?._id !== userId)
        );

        alert(`Candidate ${isVerified ? 'approved' : 'rejected'} successfully!`);
      } else {
        const errorData = await response.json();
        console.error('❌ Verification failed:', errorData);
        alert(`Failed to update: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error updating verification:', error);
      alert('Error updating verification status');
    }
  };

  if (loading) {
    return (
      <div className="admin-verifications">
        <div className="loading">Loading verifications...</div>
      </div>
    );
  }

  return (
    <div className="admin-verifications">
      <div className="verifications-header">
        <h1>Pending Verifications</h1>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'candidates' ? 'active' : ''}`}
            onClick={() => setActiveTab('candidates')}
          >
            Candidates ({pendingCandidates.length})
          </button>
          <button
            className={`tab ${activeTab === 'parties' ? 'active' : ''}`}
            onClick={() => setActiveTab('parties')}
          >
            Political Parties (0)
          </button>
        </div>
      </div>

      {activeTab === 'candidates' && (
        <div className="verifications-list">
          {pendingCandidates.length === 0 ? (
            <div className="no-pending">
              <h3>No Pending Candidate Verifications</h3>
              <p>All candidates have been verified or no candidates are awaiting approval.</p>
            </div>
          ) : (
            pendingCandidates.map(candidate => (
              <div key={candidate._id} className="verification-item">
                <div className="candidate-info">
                  <div className="candidate-photo">
                    <img
                      src={candidate.user?.profilePhoto || candidate.profilePhoto || '/default-avatar.png'}
                      alt={candidate.user?.firstName || 'Candidate'}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiNmNGY0ZjQiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjIwIiByPSIxMCIgZmlsbD0iI2NjY2NjYi8+PHJlY3QgeD0iMTUiIHk9IjM1IiB3aWR0aD0iMjAiIGhlaWdodD0iMTUiIGZpbGw9IiNjY2NjY2IiLz48L3N2Zz4=';
                      }}
                    />
                  </div>
                  <div className="candidate-details">
                    <h3>{candidate.user?.firstName || candidate.firstName} {candidate.user?.lastName || candidate.lastName}</h3>
                    <p><strong>User ID:</strong> {candidate.user?._id}</p>
                    <p><strong>Candidate ID:</strong> {candidate._id}</p>
                    <p><strong>Email:</strong> {candidate.user?.email || candidate.email}</p>
                    <p><strong>Phone:</strong> {candidate.user?.phone || candidate.phone || 'Not provided'}</p>
                    <p><strong>NIC:</strong> {candidate.user?.nic || candidate.nic || 'Not provided'}</p>
                    <p><strong>Party:</strong> {candidate.party?.name || 'Independent'}</p>
                    <p><strong>Skills:</strong> {candidate.skills?.join(', ') || 'None provided'}</p>
                    <p><strong>Objectives:</strong> {candidate.objectives?.join(', ') || 'None provided'}</p>
                    {candidate.bio && <p><strong>Bio:</strong> {candidate.bio}</p>}

                    {/* ✅ ADDED: Debug Information */}
                    <div className="debug-info" style={{marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '5px'}}>
                      <p><strong>Debug Info:</strong></p>
                      <p>User Verified: {candidate.user?.isVerified ? 'Yes' : 'No'}</p>
                      <p>Candidate Verified: {candidate.isVerified ? 'Yes' : 'No'}</p>
                      <p>User isCandidate: {candidate.user?.isCandidate ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
                <div className="verification-actions">
                  {/* ✅ FIXED: Pass user ID instead of candidate ID */}
                  <button
                    className="btn-approve"
                    onClick={() => handleVerification(candidate.user?._id, true)}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleVerification(candidate.user?._id, false)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'parties' && (
        <div className="verifications-list">
          <div className="no-pending">
            <p>No pending party verifications</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerifications;