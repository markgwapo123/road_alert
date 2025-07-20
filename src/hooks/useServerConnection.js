import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export const useServerConnection = (onServerDown) => {
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [lastCheck, setLastCheck] = useState(new Date());
  const intervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const checkServerHealth = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/health', {
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.status === 200) {
        if (!isServerOnline) {
          console.log('✅ Admin: Server connection restored');
          setIsServerOnline(true);
        }
        retryCountRef.current = 0;
        setLastCheck(new Date());
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Admin: Server health check failed:', error.message);
      retryCountRef.current += 1;
      
      if (retryCountRef.current >= maxRetries) {
        if (isServerOnline) {
          console.error('❌ Admin: Server appears to be down after', maxRetries, 'attempts');
          setIsServerOnline(false);
          if (onServerDown) {
            onServerDown();
          }
        }
      }
      return false;
    }
  };

  const startHealthCheck = () => {
    // Initial check
    checkServerHealth();
    
    // Set up periodic checks every 30 seconds
    intervalRef.current = setInterval(checkServerHealth, 30000);
  };

  const stopHealthCheck = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    startHealthCheck();
    
    return () => {
      stopHealthCheck();
    };
  }, []);

  return {
    isServerOnline,
    lastCheck,
    checkServerHealth,
    startHealthCheck,
    stopHealthCheck
  };
};

export default useServerConnection;
