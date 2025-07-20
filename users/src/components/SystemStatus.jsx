import { useState, useEffect } from 'react';

const SystemStatus = ({ serverStatus = true, lastServerCheck = null }) => {
  const [systemStatus, setSystemStatus] = useState({
    frontend: { status: 'online', message: 'Online' },
    backend: { status: 'connecting', message: 'Connecting...' }
  });

  useEffect(() => {
    // Update backend status based on server connection
    setSystemStatus(prev => ({
      ...prev,
      backend: {
        status: serverStatus ? 'online' : 'error',
        message: serverStatus ? 'Connected' : 'Disconnected'
      }
    }));
  }, [serverStatus]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'connecting': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-700';
      case 'error': return 'text-red-700';
      case 'connecting': return 'text-yellow-700';
      default: return 'text-gray-700';
    }
  };

  const StatusIndicator = ({ label, status, message, additionalInfo }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: status === 'online' ? '#28a745' : status === 'error' ? '#dc3545' : '#ffc107'
        }}></div>
        <div>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>{label}</span>
          {additionalInfo && (
            <div style={{ fontSize: '12px', color: '#6c757d' }}>{additionalInfo}</div>
          )}
        </div>
      </div>
      <span style={{
        fontSize: '14px',
        fontWeight: '500',
        color: status === 'online' ? '#28a745' : status === 'error' ? '#dc3545' : '#ffc107'
      }}>
        {message}
      </span>
    </div>
  );

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#333',
          margin: 0
        }}>
          System Status
        </h3>
      </div>
      
      <div>
        <StatusIndicator
          label="Server Connection"
          status={serverStatus ? 'online' : 'error'}
          message={serverStatus ? 'Connected' : 'Disconnected'}
          additionalInfo={lastServerCheck ? `Last check: ${lastServerCheck.toLocaleTimeString()}` : null}
        />
        
        <StatusIndicator
          label="User Interface"
          status={systemStatus.frontend.status}
          message={systemStatus.frontend.message}
        />
        
        <StatusIndicator
          label="Report Service"
          status={systemStatus.backend.status}
          message={systemStatus.backend.message}
        />
      </div>
      
      {/* Additional Info */}
      <div style={{
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #dee2e6'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <span>Auto-refresh: 30s</span>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
