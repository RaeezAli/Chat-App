import React, { memo, useCallback } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const MessageItem = memo(({ message, isOwn, onReply }) => {
  const { userId } = useAuth();
  
  const formatTime = useCallback((date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  }, []);

  const handleReaction = useCallback(async (emoji) => {
    try {
      const msgRef = doc(db, 'messages', message.id);
      const currentReactions = { ...(message.reactions || {}) };
      const isReactedWithSame = currentReactions[emoji]?.includes(userId);

      Object.keys(currentReactions).forEach(key => {
        if (currentReactions[key]) {
          currentReactions[key] = currentReactions[key].filter(id => id !== userId);
        }
      });

      if (!isReactedWithSame) {
        if (!currentReactions[emoji]) currentReactions[emoji] = [];
        currentReactions[emoji].push(userId);
      }

      const cleanedReactions = {};
      Object.entries(currentReactions).forEach(([key, users]) => {
        if (users && users.length > 0) {
          cleanedReactions[key] = users;
        }
      });

      await updateDoc(msgRef, {
        reactions: cleanedReactions
      });
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  }, [message.id, message.reactions, userId]);

  const renderMedia = () => {
    if (!message.mediaUrl) return null;

    if (message.mediaType === 'image') {
      return (
        <div className="mb-2 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-600 shadow-sm transition-transform hover:scale-[1.02] cursor-pointer">
          <img 
            src={message.mediaUrl} 
            alt="Media" 
            className="max-w-full h-auto object-cover max-h-72 w-full"
            onClick={() => window.open(message.mediaUrl, '_blank')}
          />
        </div>
      );
    }

    if (message.mediaType === 'video') {
      return (
        <div className="mb-2 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-600 shadow-sm">
          <video 
            src={message.mediaUrl} 
            controls 
            className="max-w-full h-auto max-h-72 w-full"
          />
        </div>
      );
    }

    if (message.mediaType === 'audio') {
      return (
        <div className={`mb-2 p-3 rounded-xl border flex items-center space-x-3 ${
          isOwn ? 'bg-indigo-700/30 border-indigo-400' : 'bg-gray-50 dark:bg-gray-600 border-gray-200 dark:border-gray-500'
        }`}>
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
             <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
               <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
               <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
             </svg>
          </div>
          <audio src={message.mediaUrl} controls className="h-8 max-w-[150px] sm:max-w-none filter dark:invert" />
        </div>
      );
    }

    return (
      <a 
        href={message.mediaUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`mb-2 p-3 rounded-lg border flex items-center space-x-3 transition-colors ${
          isOwn 
            ? 'bg-indigo-700/50 border-indigo-400 hover:bg-indigo-700' 
            : 'bg-gray-50 dark:bg-gray-600 border-gray-200 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500'
        }`}
      >
        <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="min-w-0 flex-grow">
          <p className="text-xs font-bold truncate uppercase tracking-tighter opacity-70">Document</p>
          <p className="text-sm truncate">View File</p>
        </div>
      </a>
    );
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center w-full my-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="px-6 py-1.5 rounded-full bg-gray-200/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-4 ${isOwn ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
          {message.senderPic ? (
            <img src={message.senderPic} alt={message.senderName} className="w-full h-full object-cover" />
          ) : (
            message.senderName?.charAt(0).toUpperCase()
          )}
        </div>
      )}
      <div className="group relative max-w-[85%] sm:max-w-[70%]" id={`msg-${message.id}`}>
        {message.replyTo && (
          <div 
            onClick={() => {
              const el = document.getElementById(`msg-${message.replyTo.messageId}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className={`mb-[-12px] pb-3 pt-2 px-3 rounded-t-2xl opacity-80 scale-95 origin-bottom border-l-4 border-indigo-400 cursor-pointer hover:opacity-100 transition-opacity ${
              isOwn ? 'bg-indigo-800/40 mr-4' : 'bg-gray-200 dark:bg-gray-800 ml-4'
            }`}
          >
            <p className="text-[10px] font-bold text-indigo-400">{message.replyTo.senderName}</p>
            <p className="text-xs truncate text-gray-400">{message.replyTo.text || 'Media'}</p>
          </div>
        )}

        <div className={`px-4 py-2 rounded-2xl shadow-sm relative min-w-[80px] break-words transition-all ${
          isOwn 
            ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10 hover:shadow-indigo-500/20' 
            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-600'
        }`}>
          {!isOwn && (
            <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 mb-1 uppercase tracking-wider truncate">
              {message.senderName}
            </p>
          )}
          
          {renderMedia()}

          {message.text && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
              {message.text}
            </p>
          )}
          
          <div className={`flex items-center justify-end mt-1 space-x-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
            <span className="text-[10px]">
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            )}
          </div>

          <div className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center space-x-1 ${
            isOwn ? 'right-full mr-2' : 'left-full ml-2'
          }`}>
             <button 
               onClick={onReply}
               className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-md text-gray-500 hover:text-indigo-600 transition-colors"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
             </button>
             <div className="flex bg-white dark:bg-gray-800 rounded-full shadow-md px-1 scale-90 sm:scale-100">
                {['👍', '❤️', '😂', '🔥'].map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`p-1.5 hover:scale-125 transition-transform ${
                      message.reactions?.[emoji]?.includes(userId) ? 'animate-bounce text-indigo-500' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {message.reactions && Object.entries(message.reactions).some(([_, users]) => users && users.length > 0) && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(message.reactions).map(([emoji, users]) => users && users.length > 0 && (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-xs font-medium border shadow-sm transition-colors ${
                  users.includes(userId)
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500'
                }`}
              >
                <span>{emoji}</span>
                <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageItem;
