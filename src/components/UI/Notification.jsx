import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Notification = () => {
  const { notification } = useAuth();

  if (!notification) return null;

  const { message, type } = notification;

  const styles = {
    success: 'bg-green-500 shadow-green-500/20',
    error: 'bg-red-500 shadow-red-500/20',
    warning: 'bg-yellow-500 shadow-yellow-500/20'
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300">
      <div className={`flex items-center space-x-3 px-6 py-3 rounded-2xl text-white font-bold shadow-2xl ${styles[type] || styles.success}`}>
        {icons[type] || icons.success}
        <span className="text-sm whitespace-nowrap">{message}</span>
      </div>
    </div>
  );
};

export default Notification;
