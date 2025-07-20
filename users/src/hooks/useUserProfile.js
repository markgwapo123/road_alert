import { useState, useEffect } from 'react';
import axios from 'axios';

export const useUserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const res = await axios.get('http://localhost:3001/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setUser(res.data.user);
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      
      // Check if it's a network error (server down)
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK' || !err.response) {
        setError('Server connection lost');
        // Don't clear user data immediately, let the server connection hook handle logout
      } else if (err.response?.status === 401) {
        // Token is invalid/expired
        setError('Authentication expired');
        setUser(null);
        localStorage.removeItem('token');
      } else {
        setError('Failed to load profile');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Listen for storage changes to update profile when other tabs modify it
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        // Token was removed, clear user data
        setUser(null);
        setLoading(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { user, loading, error, refetch: fetchProfile, setUser };
};

export default useUserProfile;
