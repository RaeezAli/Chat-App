import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';

const CallOverlay = () => {
  const { 
    isCallActive, 
    isMinimized, 
    activeCallGroup, 
    callDuration, 
    activeParticipants, 
    isMuted, 
    isSpeakerOn, 
    isConnecting, 
    remoteStreams, 
    endCall, 
    toggleMute, 
    toggleSpeaker, 
    toggleMinimize 
  } = useCall();

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e) => {
    if (!isMinimized) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    
    // Bounds check
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isCallActive || !activeCallGroup) return null;

  // Minimized View
  if (isMinimized) {
    return (
      <div 
        onMouseDown={handleMouseDown}
        style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
        className="fixed z-[9999] cursor-move animate-in fade-in zoom-in duration-300"
      >
        <div className="bg-indigo-600 p-1 rounded-2xl shadow-2xl flex items-center space-x-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-500 overflow-hidden relative flex items-center justify-center text-white font-bold text-lg">
             {activeCallGroup.name.charAt(0).toUpperCase()}
             {isConnecting && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
          </div>
          <div className="pr-4 py-1">
            <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest">{isConnecting ? 'Connecting' : 'On Call'}</p>
            <p className="text-white text-xs font-mono">{formatTime(callDuration)}</p>
          </div>
          <button 
            onClick={toggleMinimize}
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Expanded View (Full Overlay)
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-md" />
      
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 sm:p-12 text-center flex flex-col items-center">
          <div className="w-full flex justify-end absolute top-6 right-6">
            <button 
              onClick={toggleMinimize}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Minimize"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="relative mb-8 mt-4">
            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 ${isMuted ? 'border-red-500' : isConnecting ? 'border-amber-500' : 'border-indigo-500'} shadow-xl animate-pulse transition-colors duration-300`}>
               <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                 {activeCallGroup.name.charAt(0).toUpperCase()}
               </div>
            </div>
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${isMuted ? 'bg-red-600' : isConnecting ? 'bg-amber-500' : 'bg-indigo-600'} text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg transition-colors`}>
              {isMuted ? 'Muted' : isConnecting ? 'Connecting...' : 'On Call'}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{activeCallGroup.name}</h2>
          <p className="text-indigo-600 dark:text-indigo-400 font-mono text-lg mb-6">{formatTime(callDuration)}</p>
          
          <div className="flex -space-x-3 mb-8">
            {activeParticipants.map((p, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 shadow-lg border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 overflow-hidden" title={p.username}>
                {p.profilePic ? (
                  <img src={p.profilePic} alt={p.username} className="w-full h-full object-cover" />
                ) : (
                  p.username.charAt(0).toUpperCase()
                )}
              </div>
            ))}
            {activeParticipants.length === 1 && (
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 text-xs font-bold animate-pulse">
                ...
              </div>
            )}
          </div>

          <p className="text-gray-500 dark:text-gray-400 text-sm mb-12">
            Secure end-to-end encrypted voice call.
          </p>

          <div className="flex items-center justify-center space-x-6">
            <button 
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all active:scale-90 ${
                isMuted 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMuted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                )}
              </svg>
            </button>
            <button 
              onClick={endCall}
              className="p-6 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-90 hover:rotate-90 transform duration-300"
              title="End Call"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.984.984 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
              </svg>
            </button>
            <button 
              onClick={toggleSpeaker}
              className={`p-4 rounded-full transition-all active:scale-90 ${
                isSpeakerOn 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isSpeakerOn ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Hidden Audio Elements to keep stream alive */}
        <div className="hidden">
          {Object.entries(remoteStreams).map(([pId, stream]) => (
            <audio 
              key={pId} 
              autoPlay 
              playsInline
              ref={el => { if (el) el.srcObject = stream; }}
              muted={!isSpeakerOn}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;
