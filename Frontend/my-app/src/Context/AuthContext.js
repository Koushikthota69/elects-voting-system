import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

  // Enhanced admin check with multiple verification methods
  const checkAdminStatus = async (email, token) => {
    try {
      console.log('🔍 Checking admin status for:', email);

      // Method 1: Special admin email (thotakoushik69@gmail.com)
      if (email === 'thotakoushik69@gmail.com') {
        console.log('✅ Special admin user detected via email');
        localStorage.setItem('isAdmin', 'true');
        return true;
      }

      // Method 2: Check localStorage flag (backup)
      const localStorageAdmin = localStorage.getItem('isAdmin') === 'true';
      if (localStorageAdmin) {
        console.log('✅ Admin status from localStorage');
        return true;
      }

      // Method 3: Check admin status from API
      if (token) {
        const response = await fetch(`${API_BASE}/api/v1/admins/check-admin/${email}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Admin API check result:', data);

          if (data.isAdmin) {
            localStorage.setItem('isAdmin', 'true');
            return true;
          }
        }
      }

      // Not an admin
      localStorage.setItem('isAdmin', 'false');
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const userId = localStorage.getItem('user-id');

      console.log('🔍 Checking auth status:', { token, userId });

      if (!token || !userId) {
        console.log('❌ No token or user ID found');
        setIsAuthenticated(false);
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Verify token is valid by making an API call to user profile
      const response = await fetch(`${API_BASE}/api/v1/users/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        const userInfo = userData.user || userData.data;

        console.log('✅ User authenticated:', userInfo);

        if (userInfo) {
          // Check if this user is also an admin
          const adminStatus = await checkAdminStatus(userInfo.email, token);

          const userObj = {
            id: userInfo._id || userInfo.id,
            name: `${userInfo.firstName} ${userInfo.lastName}`,
            email: userInfo.email,
            isCandidate: userInfo.isCandidate || false,
            role: adminStatus ? 'admin' : (userInfo.role || 'voter')
          };

          setUser(userObj);
          setIsAuthenticated(true);
          setIsAdmin(adminStatus);

          console.log('🔐 Final user state:', {
            user: userObj,
            isAdmin: adminStatus,
            isAuthenticated: true
          });
        }
      } else {
        console.log('❌ Token verification failed');
        // Token is invalid, clear storage
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (token, userData) => {
    console.log('🔐 Logging in user:', userData);

    localStorage.setItem('auth-token', token);
    localStorage.setItem('user-id', userData._id || userData.id);
    localStorage.setItem('user-email', userData.email);

    // Check admin status for this user
    const adminStatus = await checkAdminStatus(userData.email, token);

    const userObj = {
      id: userData._id || userData.id,
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      isCandidate: userData.isCandidate || false,
      role: adminStatus ? 'admin' : (userData.role || 'voter')
    };

    setUser(userObj);
    setIsAuthenticated(true);
    setIsAdmin(adminStatus);

    console.log('✅ Login completed:', {
      user: userObj,
      isAdmin: adminStatus,
      isAuthenticated: true
    });

    // Dispatch event for components that need to update
    window.dispatchEvent(new Event('authStateChange'));
  };

  const logout = () => {
    console.log('🚪 Logging out user');

    localStorage.removeItem('auth-token');
    localStorage.removeItem('user-id');
    localStorage.removeItem('user-email');
    localStorage.removeItem('isAdmin');

    setIsAuthenticated(false);
    setUser(null);
    setIsAdmin(false);

    // Dispatch event for components that need to update
    window.dispatchEvent(new Event('authStateChange'));
  };

  const value = {
    isAuthenticated,
    user,
    isAdmin,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};