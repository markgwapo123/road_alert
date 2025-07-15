import React, { useEffect, useState } from 'react';
import axios from 'axios';

const UserProfile = ({ onLogout, isVerified, onVerify }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('http://localhost:3001/api/users/me', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setUser(res.data);
      } catch (err) {
        setError('Failed to load profile');
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!user) return null;

  return (
    <div className="user-profile">
      <h3>Profile</h3>
      <div><b>Name:</b> {user.name}</div>
      <div><b>Email:</b> {user.email}</div>
      <div>
        <b>Status:</b> 
        <span style={{color: isVerified ? '#27ae60' : '#e74c3c', marginLeft: '8px'}}>
          {isVerified ? '✅ Verified' : '⚠️ Unverified'}
        </span>
      </div>
      {!isVerified && (
        <button onClick={onVerify} style={{
          background: '#3498db',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          margin: '10px 0'
        }}>
          Verify Account
        </button>
      )}
      <button onClick={onLogout}>Logout</button>
    </div>
  );
};

export default UserProfile;
