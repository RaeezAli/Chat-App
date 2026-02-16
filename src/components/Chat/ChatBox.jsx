import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, onSnapshot, where, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import GroupInfoModal from './GroupInfoModal';
import { MessageItemSkeleton } from '../UI/Skeleton';

const ChatBox = memo(({ onBack }) => {
  const { activeGroup, handleLeaveOrDelete } = useChat();
  const [messages, setMessages] = useState([]);
  const [liveGroup, setLiveGroup] = useState(activeGroup);
  const [showInfo, setShowInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { startCall, isCallActive, toggleMinimize } = useCall();
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const { userId, showNotification } = useAuth();
  const scrollRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!activeGroup?.id) {
      setMessages([]);
      return;
    }

    // Reset messages state strictly on group change to avoid "ghost" messages
    setMessages([]);
    setLoading(true);

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
      setLoading(false);
    }, (error) => {
      console.error("Message Fetch Error:", error);
      setLoading(false);
      if (error.code === 'failed-precondition') {
        showNotification("A Firestore index is required. Check console.", 'error');
      }
    });

    return () => unsubscribe();
  }, [activeGroup?.id]);

  // Listen to active group metadata for real-time call status
  useEffect(() => {
    if (!activeGroup?.id) return;
    
    // Sync liveGroup immediately when activeGroup prop changes
    setLiveGroup(activeGroup);

    const unsubscribe = onSnapshot(doc(db, 'groups', activeGroup.id), (snapshot) => {
      if (snapshot.exists()) {
        setLiveGroup({ id: snapshot.id, ...snapshot.data() });
      }
    });

    return () => unsubscribe();
  }, [activeGroup?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]); // Scroll only when message count changes

  if (!activeGroup) {
    return (
      <div className="flex-grow hidden md:flex items-center justify-center bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl">
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
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-950 overflow-hidden md:rounded-2xl shadow-2xl md:border md:border-gray-200 dark:md:border-gray-800">
      {/* Chat Header - Fixed */}
      <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-sm z-30 flex-shrink-0">
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
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-white dark:border-gray-800 overflow-hidden">
              {liveGroup?.groupPic ? (
                <img src={liveGroup.groupPic} alt={liveGroup.name} className="w-full h-full object-cover" />
              ) : (
                liveGroup?.name?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm sm:text-base">{liveGroup?.name || activeGroup.name}</h3>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">{liveGroup?.members?.length || activeGroup.members?.length || 0} members</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2 relative" ref={menuRef}>
          <div className="hidden sm:block text-right mr-2">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Invite Code</p>
            <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{activeGroup.inviteCode}</p>
          </div>
          <div className="flex items-center space-x-1">
            {liveGroup?.currentCall?.active && !isCallActive && (
              <button 
                onClick={() => startCall(liveGroup)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse shadow-lg shadow-green-500/20"
              >
                <div className="w-2 h-2 bg-white rounded-full" />
                <span>Join Call</span>
              </button>
            )}
            
            <button 
              onClick={() => isCallActive ? toggleMinimize() : startCall(liveGroup, 'video')}
              className={`p-2 transition-colors rounded-full ${
                isCallActive && isVideoEnabled
                  ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' 
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              }`}
              title="Video Call"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            <button 
              onClick={() => isCallActive ? toggleMinimize() : startCall(liveGroup, 'voice')}
              className={`p-2 transition-colors rounded-full ${
                liveGroup?.currentCall?.active || isCallActive
                  ? 'text-green-500 hover:bg-green-50' 
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              }`}
              title={liveGroup?.currentCall?.active ? "Active Call" : "Voice Call"}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>

          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
              <button 
                onClick={() => { setShowInfo(true); setShowMenu(false); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center space-x-2 transition-colors"
              >
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Group Info</span>
              </button>
              <button 
                onClick={() => { navigator.clipboard.writeText(activeGroup.inviteCode || ''); showNotification('Invite code copied!', 'success'); setShowMenu(false); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center space-x-2 border-t border-gray-50 dark:border-gray-700 transition-colors"
              >
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copy Invite Code</span>
              </button>
              <button 
                onClick={() => { setShowInfo(true); setShowMenu(false); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center space-x-2 border-t border-gray-50 dark:border-gray-700 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Leave Group</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 space-y-2 custom-scrollbar min-h-0">
        {loading ? (
          <div className="space-y-4">
            <MessageItemSkeleton isOwn={false} />
            <MessageItemSkeleton isOwn={true} />
            <MessageItemSkeleton isOwn={false} />
            <MessageItemSkeleton isOwn={false} />
            <MessageItemSkeleton isOwn={true} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-4">
             <p className="font-medium">Welcome to {activeGroup.name}!</p>
             <p className="text-xs">No messages yet.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              isOwn={msg.senderId === userId} 
              onReply={() => setReplyingTo(msg)}
            />
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Message Input - Fixed */}
      <div className="flex-shrink-0">
        <MessageInput 
          groupId={liveGroup?.id || activeGroup.id} 
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
        />
      </div>

      <GroupInfoModal 
        isOpen={showInfo} 
        onClose={() => setShowInfo(false)} 
        group={liveGroup || activeGroup}
        onLeaveOrDelete={() => {
          setShowInfo(false);
          onLeaveOrDelete();
        }}
      />
    </div>
  );
});

export default ChatBox;
