import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import config from '../config/index.js';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [latestReport, setLatestReport] = useState(null);

  // Track processed report IDs to prevent duplicates
  const processedReportIds = useRef(new Set());

  // Queue for notification display (prevent overlapping)
  const notificationQueue = useRef([]);
  const isProcessingQueue = useRef(false);

  // Single shared AudioContext, created lazily and reused for every notification
  const audioContextRef = useRef(null);

  // Play notification sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      // Create the AudioContext once and reuse it — creating a new one on every
      // call exhausts the browser's limit on concurrent AudioContexts, which is
      // why only the first notification made a sound.
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // Browsers auto-suspend contexts under certain conditions; resume before use.
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // 800 Hz tone
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }, []);

  // Show toast notification
  const showToastNotification = useCallback((report) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 cursor-pointer transform transition-all duration-300 translate-x-full';
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-2xl">🚨</span>
        <div>
          <p class="font-semibold">New road hazard report received</p>
          <p class="text-sm opacity-90">Type: ${report.type} | Severity: ${report.severity}</p>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 10);

    // Click handler to navigate to report
    toast.addEventListener('click', () => {
      window.location.href = `/reports?reportId=${report._id}`;
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 5000);
  }, []);

  // Process notification queue with delay to prevent overlapping
  const processNotificationQueue = useCallback(() => {
    if (isProcessingQueue.current || notificationQueue.current.length === 0) {
      return;
    }

    isProcessingQueue.current = true;

    const report = notificationQueue.current.shift();

    playNotificationSound();
    showToastNotification(report);

    setTimeout(() => {
      isProcessingQueue.current = false;

      if (notificationQueue.current.length > 0) {
        processNotificationQueue();
      }
    }, 500);
  }, [playNotificationSound, showToastNotification]);

  // Connect to Socket.IO server
  const connectSocket = useCallback(() => {
    const token = localStorage.getItem('adminToken');

    if (!token) {
      console.log('⚠️ No admin token');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('⚠️ Socket already connected');
      return;
    }

    console.log('🔌 Connecting to Socket.IO server...');

    const newSocket = io(config.BACKEND_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error(err);
      setIsConnected(false);
    });

    newSocket.on('new_report', (report) => {
      console.log('📢 New report received', report);

      if (processedReportIds.current.has(report._id)) return;

      processedReportIds.current.add(report._id);

      notificationQueue.current.push(report);
      processNotificationQueue();

      setLatestReport(report);
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => [report, ...prev]);
    });
  }, [processNotificationQueue]);

  // Clear unread count
  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Remove a specific notification
  const removeNotification = useCallback((reportId) => {
    setNotifications(prev => prev.filter(n => n._id !== reportId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Disconnect socket
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      console.log('🔌 Socket disconnected');
    }
  }, []);

  // Initialize socket connection on mount
  useEffect(() => {
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket]);

  // Cleanup processed IDs periodically to prevent memory leaks
  useEffect(() => {
    const interval = setInterval(() => {
      if (processedReportIds.current.size > 1000) {
        processedReportIds.current.clear();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    unreadCount,
    notifications,
    latestReport,
    clearUnread,
    connectSocket,
    disconnectSocket,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;
