import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import GroupInfoModal from './GroupInfoModal';

const ChatBox = ({ activeGroup, onBack, onLeaveOrDelete }) => {
  const [messages, setMessages] = useState([]);
  const [showInfo, setShowInfo] = useState(false);
  const { user } = useAuth();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!activeGroup?.id) {
      setMessages([]);
      return;
    }

    // Reset messages state strictly on group change to avoid "ghost" messages
    setMessages([]);

    const q = query(
      collection(db, 'messages'), 
      where('groupId', '==', activeGroup.id),
      orderBy('createdAt', 'asc')
    );
    
    // onSnapshot provides real-time updates and handles local optimistic updates automatically
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Handle the serverTimestamp null issue: use local time as a fallback for pending writes
          createdAt: data.createdAt || { toDate: () => new Date() }
        };
      });
      setMessages(msgs);
    }, (error) => {
      console.error("Message Fetch Error:", error);
      if (error.code === 'failed-precondition') {
        alert("A Firestore index is required for this group. Please check the console for the creation link.");
      }
    });

    return () => unsubscribe();
  }, [activeGroup?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]); // Scroll only when message count changes

  if (!activeGroup) {
    return (
      <div className="flex-grow hidden md:flex items-center justify-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
        <div className="text-center p-8 max-w-sm">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
             </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Select a Group</h3>
          <p className="text-gray-500 dark:text-gray-400">Choose a group from the sidebar or create a new one to start chatting with your team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900 overflow-hidden md:rounded-2xl shadow-2xl border-x md:border border-gray-200 dark:border-gray-700">
      {/* Chat Header */}
      <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button 
            onClick={onBack}
            className="md:hidden p-2 -ml-2 text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div 
            onClick={() => setShowInfo(true)}
            className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded-lg transition-all min-w-0"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-white dark:border-gray-800">
              {activeGroup.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm sm:text-base">{activeGroup.name}</h3>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">{activeGroup.members?.length || 0} members</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="hidden sm:block text-right mr-2">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Invite Code</p>
            <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{activeGroup.inviteCode}</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-2 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-4">
             <p className="font-medium">Welcome to {activeGroup.name}!</p>
             <p className="text-xs">No messages yet.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              isOwn={msg.senderId === user.uid} 
            />
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Message Input */}
      <MessageInput groupId={activeGroup.id} />

      <GroupInfoModal 
        isOpen={showInfo} 
        onClose={() => setShowInfo(false)} 
        group={activeGroup}
        onLeaveOrDelete={() => {
          setShowInfo(false);
          onLeaveOrDelete();
        }}
      />
    </div>
  );
};

export default ChatBox;
