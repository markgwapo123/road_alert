import React from 'react';
import NotificationScreen from './NotificationScreen';

const NotificationPage = ({ notifications, onRefresh }) => {
  return <NotificationScreen prefetchedNotifications={notifications} onRefresh={onRefresh} />;
};

export default NotificationPage;

