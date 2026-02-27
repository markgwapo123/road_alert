import React from 'react';

function App() {
  console.log('App component loading...');
  console.log('Environment variables:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚧 Bantay Dalan - Debug Mode</h1>
      <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0' }}>
        <h3>Environment Info:</h3>
        <p><strong>Mode:</strong> {import.meta.env.MODE}</p>
        <p><strong>Production:</strong> {import.meta.env.PROD ? 'Yes' : 'No'}</p>
        <p><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'Not set'}</p>
        <p><strong>Backend URL:</strong> {import.meta.env.VITE_BACKEND_URL || 'Not set'}</p>
      </div>
      <div style={{ background: '#e8f5e8', padding: '10px', margin: '10px 0' }}>
        <h3>Status:</h3>
        <p>✅ React app is loading successfully</p>
        <p>✅ JavaScript is working</p>
        <p>✅ Environment variables are being read</p>
      </div>
      <button 
        onClick={() => alert('Button clicked! App is interactive.')}
        style={{ 
          background: '#007bff', 
          color: 'white', 
          padding: '10px 20px', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer' 
        }}
      >
        Test Interactivity
      </button>
    </div>
  );
}

export default App;