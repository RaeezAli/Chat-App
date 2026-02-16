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
    isVideoEnabled,
    isConnecting, 
    localStream,
    remoteStreams, 
    endCall, 
    toggleMute, 
    toggleSpeaker, 
    toggleVideo,
    toggleMinimize 
  } = useCall();

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (isMobile) {
      // Mobile Circular Bubble
      return (
        <div 
          onMouseDown={handleMouseDown}
          onClick={(e) => { if (!isDragging) toggleMinimize(); }}
          style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
          className="fixed z-[9999] cursor-move animate-in fade-in zoom-in duration-300"
        >
          <div className="relative group">
            <div className="w-16 h-16 rounded-full bg-indigo-600 shadow-2xl overflow-hidden border-2 border-white flex items-center justify-center">
              {isVideoEnabled && localStream ? (
                <video 
                  autoPlay 
                  muted 
                  playsInline 
                  ref={el => { if (el) el.srcObject = localStream; }}
                  className="w-full h-full object-cover mirror"
                />
              ) : (
                <div className="text-white font-bold text-xl">
                  {activeCallGroup.name.charAt(0).toUpperCase()}
                </div>
              )}
              {isConnecting && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {/* Call Indicator Dot */}
            <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>
        </div>
      );
    }

    // Desktop Rectangular Draggable Window
    return (
      <div 
        onMouseDown={handleMouseDown}
        style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
        className="fixed z-[9999] cursor-move animate-in fade-in zoom-in duration-300 w-64 h-40 group"
      >
        <div className="bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-800 h-full">
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {Object.keys(remoteStreams).length > 0 ? (
              <video 
                autoPlay 
                playsInline 
                ref={el => { if (el) el.srcObject = Object.values(remoteStreams)[0]; }}
                className="w-full h-full object-cover"
              />
            ) : isVideoEnabled && localStream ? (
              <video 
                autoPlay 
                muted 
                playsInline 
                ref={el => { if (el) el.srcObject = localStream; }}
                className="w-full h-full object-cover mirror opacity-50"
              />
            ) : (
              <div className="text-white/20 text-4xl font-bold uppercase">
                {activeCallGroup.name.charAt(0)}
              </div>
            )}
            
            {/* Controls Overlay on Hover */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-white text-[10px] font-mono">{formatTime(callDuration)}</span>
               <div className="flex space-x-1">
                 <button onClick={toggleMute} className={`p-1 rounded ${isMuted ? 'bg-red-500' : 'bg-white/20'} text-white`}>
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                   </svg>
                 </button>
                 <button onClick={endCall} className="p-1 rounded bg-red-600 text-white">
                   <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.984.984 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                   </svg>
                 </button>
                 <button onClick={toggleMinimize} className="p-1 rounded bg-white/20 text-white">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                   </svg>
                 </button>
               </div>
            </div>
            
            {isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
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

          <div className="relative mb-8 mt-4 w-full">
            <div className="grid grid-cols-1 gap-4 w-full max-h-[40vh] overflow-hidden">
               {/* Video Container Logic */}
               <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-xl group border-2 border-indigo-500/30">
                 {isVideoEnabled && localStream ? (
                   <video 
                     autoPlay 
                     muted 
                     playsInline 
                     ref={el => { if (el) el.srcObject = localStream; }}
                     className="w-full h-full object-cover mirror"
                   />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                     <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center text-3xl font-bold mb-4 shadow-2xl">
                       {activeCallGroup.name.charAt(0).toUpperCase()}
                     </div>
                     <span className="text-xs uppercase tracking-[0.2em] font-bold opacity-70">You</span>
                   </div>
                 )}
                 <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                   <div className={`w-2 h-2 rounded-full ${isVideoEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                   <span className="text-white text-[10px] font-bold tracking-wider uppercase">Local Preview</span>
                 </div>
               </div>

               {Object.entries(remoteStreams).map(([pId, stream]) => (
                <div key={pId} className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-indigo-500/30">
                  <video 
                    autoPlay 
                    playsInline 
                    ref={el => { if (el) el.srcObject = stream; }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-white text-[10px] font-bold tracking-wider uppercase">
                      {activeParticipants.find(p => p.userId === pId)?.username || 'Remote'}
                    </span>
                  </div>
                </div>
               ))}
            </div>

            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 ${isMuted ? 'bg-red-600' : isConnecting ? 'bg-amber-500' : 'bg-indigo-600'} text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-xl border-2 border-white dark:border-gray-800 transition-colors`}>
              {isMuted ? 'Muted' : isConnecting ? 'Connecting...' : 'Active Session'}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{activeCallGroup.name}</h2>
          <p className="text-indigo-600 dark:text-indigo-400 font-mono text-sm mb-6">{formatTime(callDuration)}</p>
          
          <div className="flex -space-x-3 mb-8">
            {activeParticipants.map((p, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 shadow-lg border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 overflow-hidden ring-2 ring-indigo-500/20" title={p.username}>
                {p.profilePic ? (
                  <img src={p.profilePic} alt={p.username} className="w-full h-full object-cover" />
                ) : (
                  p.username.charAt(0).toUpperCase()
                )}
              </div>
            ))}
          </div>

          <p className="text-gray-500 dark:text-gray-400 text-sm mb-12">
            Secure end-to-end encrypted voice call.
          </p>

          <div className="flex items-center justify-center space-x-4 sm:space-x-6">
            <button 
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all active:scale-90 ${
                isVideoEnabled
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isVideoEnabled ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
                )}
              </svg>
            </button>

            <button 
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all active:scale-90 ${
                isMuted 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={isMuted ? "Unmute" : "Mute"}
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
              className="p-6 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-90 hover:rotate-90 transform duration-300"
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
              title={isSpeakerOn ? "Speaker Off" : "Speaker On"}
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

        {/* Hidden Audio/Video Elements to keep stream alive */}
        <div className="hidden">
          {Object.entries(remoteStreams).map(([pId, stream]) => (
            <video 
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
