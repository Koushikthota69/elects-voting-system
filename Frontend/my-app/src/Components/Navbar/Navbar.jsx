import React, { useState, useEffect } from 'react';
import { useTheme } from '../../Context/ThemeContext';
import { useAuth } from '../../Context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Navbar.css';
import logo from '../Assests/logo.png';
import {
  FaUserEdit, FaSignOutAlt, FaTrashAlt, FaCaretDown,
  FaMoon, FaSun, FaCheckCircle, FaFileAlt, FaUser,
  FaExclamationCircle, FaPlus, FaUsers, FaVoteYea,
  FaTimes, FaBullhorn, FaCog, FaCamera
} from 'react-icons/fa';

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNmNGY0ZjQiLz48Y2lyY2xlIGN4PSI3NSIgY3k9IjYwIiByPSIzMCIgZmlsbD0iI2NjY2NjYyIvPjxyZWN0IHg9IjQ1IiB5PSIxMDAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI1MCIgZmlsbD0iI2NjY2NjYyIvPjwvc3ZnPg==';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [navActive, setNavActive] = useState(false);
    const [dropdownActive, setDropdownActive] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [userProfilePhoto, setUserProfilePhoto] = useState('');

    const { isAuthenticated, user, isAdmin, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const userId = user?.id;
    const userName = user?.name;
    const userEmail = user?.email;
    const isCandidate = user?.isCandidate || false;

    // Fetch user profile photo
    useEffect(() => {
        const fetchUserProfilePhoto = async () => {
            if (!isAuthenticated || !userId) return;

            try {
                const token = localStorage.getItem('auth-token');
                const response = await fetch(`${BASE_URL}/api/v1/users/profile/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                });

                if (response.ok) {
                    const userData = await response.json();
                    setUserProfilePhoto(userData.profilePhoto || userData.data?.profilePhoto || DEFAULT_AVATAR);
                }
            } catch (error) {
                console.error('Error fetching user profile photo:', error);
                setUserProfilePhoto(DEFAULT_AVATAR);
            }
        };

        if (userId && isAuthenticated) {
            fetchUserProfilePhoto();
        }
    }, [userId, isAuthenticated]);

    // Listen for auth state changes
    useEffect(() => {
        const handleAuthStateChange = () => {
            setUserProfilePhoto(DEFAULT_AVATAR);
        };

        window.addEventListener('authStateChange', handleAuthStateChange);
        return () => window.removeEventListener('authStateChange', handleAuthStateChange);
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showComplaintModal) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }

        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [showComplaintModal]);

    // Fetch candidates for complaint form
    const fetchCandidates = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`${BASE_URL}/api/v1/candidates`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCandidates(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching candidates:', error);
        }
    };

    const handleNavToggle = () => {
        setNavActive(!navActive);
        if (!navActive) {
            setDropdownActive(false);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownActive && !event.target.closest('.profile-section')) {
                setDropdownActive(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownActive]);

    const handleLogout = () => {
        Swal.fire({
            title: 'Are you sure you want to logout?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
        }).then((result) => {
            if (result.isConfirmed) {
                logout();
                window.location.replace('/');
            }
        });
    };

    const handleDeleteAccount = () => {
        Swal.fire({
            title: 'Are you sure you want to delete your account?',
            text: 'This action is irreversible!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, keep it',
            reverseButtons: true,
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`${BASE_URL}/api/v1/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
                    },
                })
                    .then((response) => {
                        if (response.ok) {
                            Swal.fire('Deleted!', 'Your account has been successfully deleted.', 'success');
                            logout();
                            window.location.replace('/');
                        } else {
                            return response.json().then((data) => {
                                throw new Error(data.message || 'Failed to delete account.');
                            });
                        }
                    })
                    .catch((error) => {
                        Swal.fire('Error', error.message, 'error');
                    });
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                Swal.fire('Cancelled', 'Your account is safe.', 'info');
            }
        });
    };

    const toggleDropdown = () => {
        setDropdownActive(!dropdownActive);
    };

    // Face Registration Function
    const handleFaceRegistration = () => {
        navigate('/face-registration');
        setDropdownActive(false);
        setNavActive(false);
    };

    // Complaint Modal Functions
    const openComplaintModal = () => {
        if (!isAuthenticated) {
            Swal.fire('Error', 'Please login to file a complaint', 'error');
            return;
        }
        setShowComplaintModal(true);
        fetchCandidates();
        setDropdownActive(false);
        setNavActive(false);
    };

    const closeComplaintModal = () => {
        setShowComplaintModal(false);
        setComplaintForm({
            candidate: '',
            title: '',
            description: '',
            proofs: []
        });
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            closeComplaintModal();
        }
    };

    const [complaintForm, setComplaintForm] = useState({
        candidate: '',
        title: '',
        description: '',
        proofs: []
    });

    const handleComplaintInputChange = (e) => {
        const { name, value } = e.target;
        setComplaintForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProofsChange = (e) => {
        setComplaintForm(prev => ({
            ...prev,
            proofs: [...e.target.files]
        }));
    };

    const handleComplaintSubmit = async (e) => {
        e.preventDefault();

        if (!isAuthenticated) {
            Swal.fire('Error', 'User not authenticated', 'error');
            return;
        }

        if (!complaintForm.candidate || !complaintForm.title || !complaintForm.description) {
            Swal.fire('Error', 'Please fill all required fields', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('user', userId);
        formData.append('candidate', complaintForm.candidate);
        formData.append('title', complaintForm.title);
        formData.append('description', complaintForm.description);
        complaintForm.proofs.forEach(file => formData.append('proofs', file));

        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`${BASE_URL}/api/v1/complaints`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                Swal.fire('Success', 'Complaint submitted successfully', 'success');
                closeComplaintModal();
            } else {
                Swal.fire('Error', data.message || 'Failed to submit complaint', 'error');
            }
        } catch (error) {
            console.error('Error submitting complaint:', error);
            Swal.fire('Error', 'Failed to submit complaint', 'error');
        }
    };

    // Close mobile nav when route changes
    useEffect(() => {
        setNavActive(false);
    }, [location]);

    return (
        <>
            <div className={`navbar ${theme}`}>
                <header>
                    <Link to="/" onClick={() => window.scrollTo(0, 0)}>
                        <img className="logo-img" src={logo} alt="E-Voting System" />
                    </Link>
                    <nav className={navActive ? 'nav-active' : ''}>
                        <div className="a">
                            <div className='link-list'>
                                <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
                                <Link to="/candidates" className={location.pathname === '/candidates' ? 'active' : ''}>Politicians</Link>
                                <Link to="/elections" className={location.pathname === '/elections' ? 'active' : ''}>Elections</Link>
                                <Link to="/results" className={location.pathname === '/results' ? 'active' : ''}>Results</Link>
                                {isAdmin && (
                                    <Link to="/admin/dashboard" className={location.pathname === '/admin/dashboard' ? 'active' : ''}>Admin Dashboard</Link>
                                )}
                                <Link to="/contact" className={location.pathname === '/contact' ? 'active' : ''}>Contact</Link>
                                <Link to="/about" className={location.pathname === '/about' ? 'active' : ''}>About</Link>
                            </div>

                            {/* Profile Section */}
                            {isAuthenticated ? (
                                <div className="profile-section">
                                    <div className="welcome-message" onClick={toggleDropdown}>
                                        <img
                                            src={userProfilePhoto}
                                            alt="Profile"
                                            className="profile-photo"
                                            onError={(e) => {
                                                e.target.src = DEFAULT_AVATAR;
                                            }}
                                        />
                                        <span className="user-name">{userName || 'User'}</span>
                                        {isAdmin && <span className="admin-badge">Admin</span>}
                                        <FaCaretDown className={`caret-icon ${dropdownActive ? 'rotate' : ''}`} />
                                    </div>

                                    {dropdownActive && (
                                        <div className="dropdown-menu">
                                            <div className="dropdown-item username">
                                                Hi, {userName}
                                                {isAdmin && <span className="admin-indicator"> (Admin)</span>}
                                            </div>

                                            {/* Face Registration Button */}
                                            <button className="dropdown-item dplink" onClick={handleFaceRegistration}>
                                                <FaCamera className="icon" /> Face Registration
                                            </button>

                                            {/* File Complaint Button */}
                                            <button className="dropdown-item dplink" onClick={openComplaintModal}>
                                                <FaBullhorn className="icon" /> File Complaint
                                            </button>

                                            {/* Admin Links */}
                                            {isAdmin && (
                                                <>
                                                    <div className="dropdown-section-divider">Admin Panel</div>
                                                    <Link to="/admin/create-election" className="dropdown-item dplink" onClick={() => setDropdownActive(false)}>
                                                        <FaPlus className="icon" /> Create Election
                                                    </Link>
                                                    <Link to="/admin/create-party" className="dropdown-item dplink" onClick={() => setDropdownActive(false)}>
                                                        <FaUsers className="icon" /> Create Party
                                                    </Link>
                                                    <Link to="/admin/verifications" className="dropdown-item dplink" onClick={() => setDropdownActive(false)}>
                                                        <FaCheckCircle className="icon" /> Candidate Verifications
                                                    </Link>
                                                    <Link to="/admin/dashboard" className="dropdown-item dplink" onClick={() => setDropdownActive(false)}>
                                                        <FaCog className="icon" /> Admin Dashboard
                                                    </Link>
                                                    <div className="dropdown-section-divider"></div>
                                                </>
                                            )}

                                            {/* Candidate Links */}
                                            {isCandidate && (
                                                <Link to={`/candidate/${userId}`} className="dropdown-item dplink" onClick={() => setDropdownActive(false)}>
                                                    <FaUser className="icon" /> Your Profile
                                                </Link>
                                            )}

                                            <Link to={`/edit-users/${userId}`} className="dropdown-item dplink" onClick={() => setDropdownActive(false)}>
                                                <FaUserEdit className="icon" /> Edit Profile
                                            </Link>

                                            {isCandidate && (
                                                <Link to={`/description`} className='dropdown-item dplink' onClick={() => setDropdownActive(false)}>
                                                    <FaFileAlt className="icon" /> Add Description
                                                </Link>
                                            )}

                                            {isCandidate && (
                                                <Link to={`/complaints`} className='dropdown-item dplink' onClick={() => setDropdownActive(false)}>
                                                    <FaExclamationCircle className="icon" /> Complaints
                                                </Link>
                                            )}

                                            <Link to={`/filed-complaints/${userId}`} className='dropdown-item dplink' onClick={() => setDropdownActive(false)}>
                                                <FaCheckCircle className="icon" /> Filed Complaints
                                            </Link>

                                            <div className="dropdown-section-divider"></div>

                                            <button className="dropdown-item" onClick={handleLogout}>
                                                <FaSignOutAlt className="icon" /> Logout
                                            </button>
                                            <button className="dropdown-item delete-acc" onClick={handleDeleteAccount}>
                                                <FaTrashAlt className="icon" /> Delete Account
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link to="/login" className="tooltip-container">
                                    Login
                                </Link>
                            )}
                        </div>
                    </nav>

                    <div className="theme-toggle" onClick={toggleTheme}>
                        {theme === 'light' ? <FaMoon /> : <FaSun />}
                    </div>

                    <div className="hamburger" onClick={handleNavToggle}>
                        &#9776;
                    </div>
                </header>
            </div>

            {/* Complaint Modal */}
            {showComplaintModal && (
                <div className="complaint-modal-overlay" onClick={handleOverlayClick}>
                    <div className="complaint-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="complaint-modal-header">
                            <h2>File a Complaint</h2>
                            <button className="close-btn" onClick={closeComplaintModal}>
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleComplaintSubmit} className="complaint-form">
                            <div className="form-group">
                                <label>Candidate *</label>
                                <select
                                    name="candidate"
                                    value={complaintForm.candidate}
                                    onChange={handleComplaintInputChange}
                                    required
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
                            </div>

                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={complaintForm.title}
                                    onChange={handleComplaintInputChange}
                                    placeholder="Enter complaint title"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    name="description"
                                    value={complaintForm.description}
                                    onChange={handleComplaintInputChange}
                                    placeholder="Describe your complaint in detail..."
                                    rows="4"
                                    required
                                ></textarea>
                            </div>

                            <div className="form-group">
                                <label>Evidence (Optional)</label>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleProofsChange}
                                    accept="image/*,.pdf,.doc,.docx"
                                />
                                <small>You can upload multiple files (images, PDFs, documents)</small>
                            </div>

                            <div className="complaint-modal-actions">
                                <button type="button" className="btn-cancel" onClick={closeComplaintModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-submit">
                                    Submit Complaint
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;