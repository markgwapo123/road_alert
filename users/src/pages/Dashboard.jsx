import React from 'react';
import ReportForm from '../components/ReportForm';
import NewsFeed from '../components/NewsFeed';

const Dashboard = () => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Left Column - Report Form */}
        <div style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          height: 'fit-content'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: '#333'
          }}>
            Report a Road Issue
          </h2>
          <ReportForm />
        </div>

        {/* Right Column - News Feed */}
        <div style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: '#333'
          }}>
            Recent Reports
          </h2>
          <NewsFeed />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
