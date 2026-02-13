import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import EditProfileModal from './EditProfileModal';

const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { username, userId, profilePic, logout, showNotification } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    showNotification('User ID copied to clipboard!', 'success');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all border-2 border-transparent active:scale-95 overflow-hidden shadow-sm"
      >
        {profilePic ? (
          <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold uppercase">{username?.charAt(0) || 'U'}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[100] p-4 animate-in fade-in zoom-in duration-200">
          <div className="flex flex-col items-center mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-2 shadow-lg overflow-hidden border-2 border-white dark:border-gray-700">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                username?.charAt(0) || 'U'
              )}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{username}</h3>
            <p className="text-xs text-gray-400 font-mono mt-1 break-all text-center">ID: {userId}</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => { setIsEditOpen(true); setIsOpen(false); }}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M15.172 2.172a4 4 0 115.656 5.656L12 17.656l-4 1 1-4 9.172-9.172z" />
              </svg>
              <span>Edit Profile</span>
            </button>
            <button
              onClick={copyUserId}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copy User ID</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      <EditProfileModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
    </div>
  );
};

export default ProfileDropdown;
