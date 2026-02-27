import React, { useState, useEffect } from 'react';
import { testConnection } from '../utils/api';

const ConnectionStatus = () => {
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    checkConnection();
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    const result = await testConnection();
    if (result.success) {
      setStatus('connected');
      setError('');
    } else {
      setStatus('disconnected');
      setError(result.error);
    }
  };

  if (status === 'checking') {
    return (
      <div className="connection-status checking">
        🔄 Checking backend connection...
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className="connection-status connected">
        ✅ Backend connected
      </div>
    );
  }

  return (
    <div className="connection-status disconnected">
      ❌ Backend disconnected: {error}
      <br />
      <small>Make sure your backend server is running on port 3001</small>
    </div>
  );
};

export default ConnectionStatus;
