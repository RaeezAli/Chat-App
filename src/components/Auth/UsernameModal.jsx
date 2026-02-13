import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const UsernameModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState('selection'); // 'selection', 'signup', 'login', 'success'
  const [inputValue, setInputValue] = useState('');
  const [generatedId, setGeneratedId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signup, login, showNotification } = useAuth();

  if (!isOpen) return null;

  const handleCreateNew = () => {
    setStep('signup');
    setError('');
  };

  const handleExistingUser = () => {
    setStep('login');
    setError('');
  };

  const handleBack = () => {
    setStep('selection');
    setInputValue('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      if (step === 'signup') {
        const id = await signup(inputValue.trim());
        setGeneratedId(id);
        setStep('success'); // Show the ID to the user
      } else {
        const success = await login(inputValue.trim());
        if (!success) {
          setError('Invalid User ID. Please check and try again.');
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'selection':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Welcome!</h2>
            <p className="text-center text-gray-500 dark:text-gray-400">Do you already have an account?</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleExistingUser}
                className="py-4 px-6 bg-white dark:bg-gray-700 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all active:scale-95"
              >
                Yes, login
              </button>
              <button
                onClick={handleCreateNew}
                className="py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
              >
                No, join
              </button>
            </div>
          </div>
        );
      case 'signup':
        return (
          <div className="space-y-6">
            <button onClick={handleBack} className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center hover:underline">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What's your name?</h2>
            <p className="text-gray-500 dark:text-gray-400">Enter a username to start chatting.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Username..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Start Chatting'}
              </button>
            </form>
          </div>
        );
      case 'login':
        return (
          <div className="space-y-6">
             <button onClick={handleBack} className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center hover:underline">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enter your User ID</h2>
            <p className="text-gray-500 dark:text-gray-400">Paste your unique ID to restore your identity.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Paste User ID here..."
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${error ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white`}
                autoFocus
                required
              />
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Checking...' : 'Restore Identity'}
              </button>
            </form>
          </div>
        );
      case 'success':
        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Created!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Please save your unique ID to log in on other devices:</p>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 relative group">
              <p className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 break-all">
                {generatedId}
              </p>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedId);
                  showNotification('Copied to clipboard!', 'success');
                }}
                className="mt-2 text-[10px] text-gray-400 hover:text-indigo-600 font-bold uppercase tracking-widest transition-colors"
              >
                Copy ID
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
            >
              Enter Chat
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md transform transition-all animate-in fade-in zoom-in duration-300 relative overflow-hidden">
        <div className="p-8">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default UsernameModal;
