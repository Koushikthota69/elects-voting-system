import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import { FaCrown, FaGavel, FaMapMarkedAlt, FaArrowUp } from 'react-icons/fa';
import './Election.css';
import { useTheme } from '../../Context/ThemeContext';
import { API_ENDPOINTS } from '../../config/api';

const Election = () => {
  const { theme } = useTheme();
  const [elections, setElections] = useState({
    general: [],
    presidential: [],
    parlimentary: [],
    provincial: [],
  });
  const [countdowns, setCountdowns] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [userIsCandidate, setUserIsCandidate] = useState(false);

  const userId = localStorage.getItem('user-id');
  const token = localStorage.getItem('auth-token');

  const fetchElectionData = async (url, type) => {
    try {
      const response = await axios.get(url);
      const data = response.data.data || response.data || [];

      // ✅ FIXED: Transform date fields to ensure proper format
      const transformedData = data.map(election => ({
        ...election,
        date: election.date || election.formattedDate || 'Invalid Date'
      }));

      setElections(prev => ({ ...prev, [type]: transformedData }));
      return true;
    } catch (err) {
      console.error(`Error fetching ${type} elections:`, {
        message: err.message,
        status: err.response?.status
      });
      return false;
    }
  };

  const checkIfUserIsCandidate = async () => {
    if (!userId) return false;

    try {
      const response = await axios.get(API_ENDPOINTS.USER_PROFILE(userId), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const isCandidate = response.data.user?.isCandidate || false;
      setUserIsCandidate(isCandidate);
      return isCandidate;
    } catch (err) {
      console.error('❌ Error checking user status:', err);
      return false;
    }
  };

  useEffect(() => {
    const fetchAllElections = async () => {
      setLoading(true);
      setError(null);

      if (userId) {
        await checkIfUserIsCandidate();
      }

      const results = await Promise.all([
        fetchElectionData(API_ENDPOINTS.ELECTIONS, 'general'),
        fetchElectionData(API_ENDPOINTS.PRESIDENTIAL_ELECTIONS, 'presidential'),
        fetchElectionData(API_ENDPOINTS.PARLIAMENTARY_ELECTIONS, 'parlimentary'),
        fetchElectionData(API_ENDPOINTS.PROVINCIAL_ELECTIONS, 'provincial'),
      ]);

      const allFailed = results.every(result => !result);
      if (allFailed) {
        setError('Failed to load election data. Please try again later.');
      }

      setLoading(false);
    };

    fetchAllElections();

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [userId]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (type) => {
    const section = document.getElementById(`${type}-section`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ✅ FIXED: Improved date/time formatting function
  const formatDateTime = (dateString, timeString) => {
    try {
      // Handle invalid date strings
      if (!dateString || dateString === 'Invalid Date' || dateString === 'Invalid Date/Time') {
        return 'Invalid Date';
      }

      // Parse the date string
      let date;
      if (typeof dateString === 'string' && dateString.includes('T')) {
        // If it's an ISO string
        date = new Date(dateString);
      } else if (typeof dateString === 'string') {
        // If it's just a date string like "2025-11-07"
        date = new Date(dateString + 'T00:00:00');
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      // Format date
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      // Format time
      let formattedTime = 'Invalid Time';
      if (timeString && typeof timeString === 'string') {
        if (timeString.includes(':')) {
          const [hours, minutes] = timeString.split(':');
          const hour = parseInt(hours);
          if (!isNaN(hour)) {
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            formattedTime = `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
          }
        } else {
          formattedTime = timeString;
        }
      }

      return `${formattedDate}, ${formattedTime}`;
    } catch (error) {
      console.error('Error formatting date/time:', error);
      return 'Invalid Date/Time';
    }
  };

  // ✅ FIXED: Improved countdown calculation
  const calculateCountdowns = (electionList, type) => {
    const newCountdowns = {};

    electionList.forEach(election => {
      try {
        const now = new Date();
        let electionDate;

        // Handle different date formats
        if (election.date && typeof election.date === 'string') {
          if (election.date.includes('T')) {
            electionDate = new Date(election.date);
          } else {
            electionDate = new Date(election.date + 'T00:00:00');
          }
        } else {
          newCountdowns[election._id] = 'Invalid Date';
          return;
        }

        if (isNaN(electionDate.getTime())) {
          newCountdowns[election._id] = 'Invalid Date';
          return;
        }

        // Combine date with time string properly
        const [startHours, startMinutes] = election.startTime.split(':');
        const [endHours, endMinutes] = election.endTime.split(':');

        const startDateTime = new Date(electionDate);
        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

        const endDateTime = new Date(electionDate);
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        if (now < startDateTime) {
          const timeLeft = startDateTime - now;
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

          if (days > 0) {
            newCountdowns[election._id] = `${days}d ${hours}h ${minutes}m ${seconds}s`;
          } else {
            newCountdowns[election._id] = `${hours}h ${minutes}m ${seconds}s`;
          }
        } else if (now >= startDateTime && now <= endDateTime) {
          newCountdowns[election._id] = '🟢 Election Live!';
        } else {
          newCountdowns[election._id] = '🔴 Election Ended';
        }
      } catch (error) {
        console.error('Error calculating countdown for election:', election._id, error);
        newCountdowns[election._id] = 'Error calculating time';
      }
    });

    setCountdowns(prev => ({ ...prev, [type]: newCountdowns }));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      Object.keys(elections).forEach(type => {
        if (elections[type].length > 0) {
          calculateCountdowns(elections[type], type);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [elections]);

  const handleApply = async (electionId, electionType, electionProvince = null) => {
    if (!userId) {
      Swal.fire('Error', 'Please login to apply for elections', 'error');
      return;
    }

    if (!userIsCandidate) {
      return Swal.fire('Error', "You aren't a candidate. Please register as a candidate first.", 'error');
    }

    // Check province for provincial elections
    if (electionType === 'provincial' && electionProvince) {
      try {
        const response = await axios.get(API_ENDPOINTS.USER_PROFILE(userId), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        let userProvince = response.data.user?.province;
        userProvince = userProvince?.replace(" Province", "").trim();

        if (userProvince !== electionProvince) {
          return Swal.fire('Error', `You can only apply for provincial elections in your province (${userProvince}).`, 'error');
        }
      } catch (err) {
        return Swal.fire('Error', 'Failed to verify user province', 'error');
      }
    }

    // Determine the endpoint based on election type
    let endpoint;
    switch (electionType) {
      case 'general':
        endpoint = API_ENDPOINTS.APPLY_GENERAL_ELECTION(electionId);
        break;
      case 'presidential':
        endpoint = API_ENDPOINTS.APPLY_PRESIDENTIAL_ELECTION(electionId);
        break;
      case 'parlimentary':
        endpoint = API_ENDPOINTS.APPLY_PARLIAMENTARY_ELECTION(electionId);
        break;
      case 'provincial':
        endpoint = API_ENDPOINTS.APPLY_PROVINCIAL_ELECTION(electionId);
        break;
      default:
        return Swal.fire('Error', 'Invalid election type', 'error');
    }

    // Confirm application
    try {
      const result = await Swal.fire({
        title: 'Confirm Application',
        text: 'Are you sure you want to apply for this election?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Apply',
        cancelButtonText: 'Cancel',
      });

      if (result.isConfirmed) {
        const response = await axios.post(endpoint, { userId }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        Swal.fire('Applied!', response.data.message, 'success');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An error occurred';
      Swal.fire('Error', errorMessage, 'error');
    }
  };

  const getElectionLink = (type, id) => {
    switch (type) {
      case 'presidential':
        return `/presidential-election/${id}`;
      case 'parlimentary':
        return `/parlimentary-election/${id}`;
      case 'provincial':
        return `/provincial-election/${id}`;
      default:
        return `/election/${id}`;
    }
  };

  // ✅ FIXED: Render elections with proper date/time display
  const renderElections = (electionList, type) => (
    <div id={`${type}-section`} className="election-section">
      <h2 className="el-lst-title">{type.charAt(0).toUpperCase() + type.slice(1)} Elections</h2>
      {electionList.length > 0 ? (
        <div className={`el-lst-table ${theme}`}>
          {electionList.map(election => (
            <div key={election._id} className={`el-lst-item ${theme}`}>
              <Link to={getElectionLink(type, election._id)}>
                <table className={`el-lst-details ${theme}`}>
                  <tbody>
                    <tr>
                      <td><strong>Election Name:</strong></td>
                      <td className='el-lst-name'>
                        {type === 'presidential' ? `Presidential Election ${election.year}` :
                         type === 'parlimentary' ? `Parliamentary Election ${election.year}` :
                         type === 'provincial' ? `Provincial Election ${election.year}` :
                         election.name}
                      </td>
                    </tr>
                    {type === 'provincial' && (
                      <tr>
                        <td><strong>Province:</strong></td>
                        <td>{election.province}</td>
                      </tr>
                    )}
                    {type === 'general' && (
                      <tr>
                        <td><strong>Location:</strong></td>
                        <td>{election.where}</td>
                      </tr>
                    )}
                    <tr>
                      <td><strong>Date:</strong></td>
                      <td>
                        {election.date && election.date !== 'Invalid Date'
                          ? new Date(election.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Invalid Date'
                        }
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Start:</strong></td>
                      <td>{formatDateTime(election.date, election.startTime)}</td>
                    </tr>
                    <tr>
                      <td><strong>End:</strong></td>
                      <td>{formatDateTime(election.date, election.endTime)}</td>
                    </tr>
                    <tr>
                      <td><strong>Countdown:</strong></td>
                      <td>{countdowns[type]?.[election._id] || 'Calculating...'}</td>
                    </tr>
                  </tbody>
                </table>
              </Link>
              {userIsCandidate && (
                <button
                  onClick={() => handleApply(election._id, type, election.province)}
                  className="el-lst-apply-btn"
                >
                  Apply
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !loading && <p className="el-lst-empty">No {type} elections found.</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading elections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`el-lst-container ${theme}`}>
      <h1 className={`el-lst-title ${theme}`}>Elections</h1>

      <div className={`el-lst-buttons ${theme}`}>
        <button onClick={() => scrollToSection('presidential')} className="el-btn">
          <FaCrown className="el-icon" /> Presidential Elections
        </button>
        <button onClick={() => scrollToSection('parlimentary')} className="el-btn">
          <FaGavel className="el-icon" /> Parliamentary Elections
        </button>
        <button onClick={() => scrollToSection('provincial')} className="el-btn">
          <FaMapMarkedAlt className="el-icon" /> Provincial Elections
        </button>
      </div>

      {renderElections(elections.general, 'general')}
      {renderElections(elections.presidential, 'presidential')}
      {renderElections(elections.parlimentary, 'parlimentary')}
      {renderElections(elections.provincial, 'provincial')}

      {showScrollTop && (
        <button onClick={scrollToTop} className="scroll-to-top-btn">
          <FaArrowUp />
        </button>
      )}
    </div>
  );
};

export default Election;