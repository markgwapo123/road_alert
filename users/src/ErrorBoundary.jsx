import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1>🚧 Road Alert - Error</h1>
          <div style={{ background: '#ffebee', padding: '10px', margin: '10px 0', border: '1px solid #f44336' }}>
            <h3>Something went wrong:</h3>
            <p>{this.state.error?.toString()}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              background: '#f44336', 
              color: 'white', 
              padding: '10px 20px', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer' 
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;