import React, { useState, useEffect } from 'react';
import { useTheme } from '../../Context/ThemeContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS, API_BASE } from '../../config/api';

import { 
  FaUsers, FaVoteYea, FaChartBar, FaExclamationTriangle, 
  FaCheckCircle, FaClock, FaPlus, FaList 
} from 'react-icons/fa';
import './AdminStyles.css';

const AdminDashboard = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCandidates: 0,
    totalElections: 0,
    pendingVerifications: 0,
    activeElections: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // ✅ FIXED API CALLS - Handle different response structures
      const [usersResponse, candidatesResponse, electionsResponse, pendingResponse] = await Promise.all([
        axios.get(`${API_BASE}/api/v1/users`, { headers }),
        axios.get(API_ENDPOINTS.CANDIDATES, { headers }),
        axios.get(API_ENDPOINTS.ELECTIONS, { headers }),
        axios.get(API_ENDPOINTS.PENDING_VERIFICATIONS, { headers })
      ]);

      console.log('Users response:', usersResponse.data);
      console.log('Candidates response:', candidatesResponse.data);
      console.log('Elections response:', electionsResponse.data);
      console.log('Pending response:', pendingResponse.data);

      // ✅ FIXED: Handle different response structures
      setStats({
        totalUsers: usersResponse.data.users?.length || usersResponse.data.data?.length || 0,
        totalCandidates: candidatesResponse.data.candidates?.length || candidatesResponse.data.data?.length || 0,
        totalElections: electionsResponse.data.elections?.length || electionsResponse.data.data?.length || 0,
        pendingVerifications: pendingResponse.data.users?.length || pendingResponse.data.count || 0,
        activeElections: 0 // You can calculate this from elections data
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Failed to load dashboard statistics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Create Election',
      description: 'Set up a new election',
      icon: <FaPlus />,
      link: '/admin/create-election',
      color: '#4CAF50'
    },
    {
      title: 'Create Party',
      description: 'Register new political party',
      icon: <FaUsers />,
      link: '/admin/create-party',
      color: '#2196F3'
    },
    {
      title: 'Verify Candidates',
      description: 'Review pending verifications',
      icon: <FaCheckCircle />,
      link: '/admin/verifications',
      color: '#FF9800'
    },
    {
      title: 'View All Elections',
      description: 'Manage existing elections',
      icon: <FaList />,
      link: '/elections',
      color: '#9C27B0'
    }
  ];

  if (loading) {
    return (
      <div className={`admin-container ${theme}`}>
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className={`admin-container ${theme}`}>
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage your e-voting system</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={fetchDashboardStats} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#4CAF50' }}>
            <FaUsers />
          </div>
          <div className="stat-info">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#2196F3' }}>
            <FaVoteYea />
          </div>
          <div className="stat-info">
            <h3>{stats.totalCandidates}</h3>
            <p>Candidates</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FF9800' }}>
            <FaChartBar />
          </div>
          <div className="stat-info">
            <h3>{stats.totalElections}</h3>
            <p>Total Elections</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#F44336' }}>
            <FaExclamationTriangle />
          </div>
          <div className="stat-info">
            <h3>{stats.pendingVerifications}</h3>
            <p>Pending Verifications</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <Link key={index} to={action.link} className="quick-action-card">
              <div className="action-icon" style={{ color: action.color }}>
                {action.icon}
              </div>
              <div className="action-content">
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-item">
            <FaClock className="activity-icon" />
            <div className="activity-content">
              <p>New user registration pending verification</p>
              <span>2 minutes ago</span>
            </div>
          </div>
          <div className="activity-item">
            <FaCheckCircle className="activity-icon" />
            <div className="activity-content">
              <p>Election "Local Government 2024" created</p>
              <span>1 hour ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;