import React from 'react';

const MessageItem = ({ message, isOwn }) => {
  const formatTime = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  };

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

    // Default to doc/file
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
        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 9l-4-4m0 0l-4 4m4-4v12" />
        </svg>
      </a>
    );
  };

  return (
    <div className={`flex w-full mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-2 rounded-2xl shadow-sm relative group ${
        isOwn 
          ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10' 
          : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-600'
      }`}>
        {!isOwn && (
          <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 mb-1 uppercase tracking-wider">
            {message.senderName}
          </p>
        )}
        
        {renderMedia()}

        {message.text && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.text}
          </p>
        )}
        
        <div className={`flex items-center justify-end mt-1 space-x-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
          <span className="text-[10px]">
            {formatTime(message.createdAt)}
          </span>
          {isOwn && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
