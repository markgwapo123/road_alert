import React from 'react';

const Dashboard = ({ token }) => {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>This is a simple dashboard component.</p>
      <p>Token: {token ? 'Present' : 'Not present'}</p>
  {/* Verification status removed */}
    </div>
  );
};

export default Dashboard;
