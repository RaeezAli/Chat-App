import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, updateDoc, onSnapshot, serverTimestamp, addDoc, collection, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { getIceServers } from '../../utils/iceSettings';

const VoiceCallModal = ({ isOpen, onClose, group }) => {
  const { userId, username, profilePic, showNotification } = useAuth();
  const [callDuration, setCallDuration] = useState(0);
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [iceServers, setIceServers] = useState([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]);
  const [wasActive, setWasActive] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { userId: MediaStream }
  const peerConnections = React.useRef({}); // { userId: RTCPeerConnection }
  const signalingSubscriptions = React.useRef({}); // { userId: unsubscribeFn }

  useEffect(() => {
    if (isOpen) {
      const fetchIce = async () => {
        const servers = await getIceServers();
        setIceServers(servers);
      };
      fetchIce();
    }
  }, [isOpen]);

  useEffect(() => {
    let timer;
    if (isOpen) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      startLocalStream();
    } else {
      setCallDuration(0);
      setWasActive(false);
      stopLocalStream();
    }

    return () => {
      if (timer) clearInterval(timer);
      if (isOpen) {
        cleanupAllConnections();
        leaveCall();
      }
    };
  }, [isOpen]);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      joinCall(stream);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone.");
      onClose();
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const cleanupAllConnections = () => {
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    Object.values(signalingSubscriptions.current).forEach(unsub => unsub());
    signalingSubscriptions.current = {};
    setRemoteStreams({});
  };

  // Real-time listener for call members
  useEffect(() => {
    if (!group?.id || !isOpen || !localStream) return;

    const unsubscribe = onSnapshot(doc(db, 'groups', group.id), (snapshot) => {
      const data = snapshot.data();
      if (data?.currentCall?.active) {
        setWasActive(true);
        const participants = data.currentCall.participants || [];
        setActiveParticipants(participants);
        
        // Connect to any new participants
        participants.forEach(p => {
          if (p.userId !== userId && !peerConnections.current[p.userId]) {
            createPeerConnection(p.userId, localStream, false);
          }
        });

        // Cleanup stale connections
        Object.keys(peerConnections.current).forEach(pId => {
          if (!participants.some(p => p.userId === pId)) {
            closePeerConnection(pId);
          }
        });

      } else if (isOpen && wasActive) {
        console.log("Call ended, auto-closing modal");
        onClose();
      }
    });

    return () => unsubscribe();
  }, [group?.id, isOpen, localStream]);

  // Signaling listeners
  useEffect(() => {
    if (!isOpen || !localStream) return;

    const callRef = collection(db, 'groups', group.id, 'calls');
    const unsubscribe = onSnapshot(query(callRef, where('to', '==', userId)), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const fromId = data.from;

          if (data.type === 'offer') {
            await handleOffer(fromId, data.offer, localStream);
          } else if (data.type === 'answer') {
            await handleAnswer(fromId, data.answer);
          } else if (data.type === 'candidate') {
            await handleCandidate(fromId, data.candidate);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [isOpen, localStream]);

  const createPeerConnection = (targetUserId, stream, isInitiator) => {
    const pc = new RTCPeerConnection({ iceServers });
    peerConnections.current[targetUserId] = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage(targetUserId, { type: 'candidate', candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received remote track from ${targetUserId}`);
      setRemoteStreams(prev => ({ ...prev, [targetUserId]: event.streams[0] }));
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE Connection State with ${targetUserId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn(`ICE connection failed for ${targetUserId}. This usually indicates a Firewall/NAT issue that requires a TURN server.`);
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignalingMessage(targetUserId, { type: 'offer', offer });
        } catch (e) {
          console.error("Error creating offer:", e);
        }
      };
    }

    return pc;
  };

  const handleOffer = async (fromId, offer, stream) => {
    let pc = peerConnections.current[fromId];
    if (!pc) pc = createPeerConnection(fromId, stream, false);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignalingMessage(fromId, { type: 'answer', answer });
  };

  const handleAnswer = async (fromId, answer) => {
    const pc = peerConnections.current[fromId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleCandidate = async (fromId, candidateData) => {
    const pc = peerConnections.current[fromId];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidateData));
    }
  };

  const sendSignalingMessage = async (targetUserId, data) => {
    if (!group?.id) return;
    const callRef = collection(db, 'groups', group.id, 'calls');
    await addDoc(callRef, {
      ...data,
      from: userId,
      to: targetUserId,
      createdAt: serverTimestamp()
    });
  };

  const closePeerConnection = (pId) => {
    if (peerConnections.current[pId]) {
      peerConnections.current[pId].close();
      delete peerConnections.current[pId];
    }
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[pId];
      return next;
    });
  };

  const joinCall = async (stream) => {
    if (!group?.id) return;
    const groupRef = doc(db, 'groups', group.id);
    
    try {
      // Cleanup old signaling messages before joining
      const oldCalls = await getDocs(collection(db, 'groups', group.id, 'calls'));
      oldCalls.forEach(doc => deleteDoc(doc.ref));

      const currentParticipants = group.currentCall?.participants || [];
      if (currentParticipants.some(p => p.userId === userId)) return;

      const newParticipants = [
        ...currentParticipants,
        { userId, username, profilePic: profilePic || '', joinedAt: new Date().toISOString() }
      ];

      await updateDoc(groupRef, {
        currentCall: {
          active: true,
          startedBy: group.currentCall?.startedBy || userId,
          participants: newParticipants
        }
      });

      // After updating Firestore, initiate connections to all EXISTING participants
      currentParticipants.forEach(p => {
        if (p.userId !== userId) {
          createPeerConnection(p.userId, stream, true);
        }
      });

      // System Announcement (only if starting the call)
      if (!group.currentCall?.active) {
        await addDoc(collection(db, 'messages'), {
          groupId: group.id,
          senderId: 'system',
          senderName: 'System',
          text: `${username} started a voice call`,
          type: 'system',
          createdAt: serverTimestamp()
        });
      } else {
        // If joining an existing call
        await addDoc(collection(db, 'messages'), {
          groupId: group.id,
          senderId: 'system',
          senderName: 'System',
          text: `${username} joined the call`,
          type: 'system',
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
       console.error("Error joining call:", error);
    }
  };

  const leaveCall = async () => {
    if (!group?.id) return;
    const groupRef = doc(db, 'groups', group.id);
    
    try {
      // We use the most recent participants from props/state
      const participants = group.currentCall?.participants || activeParticipants;
      const updatedParticipants = participants.filter(p => p.userId !== userId);
      
      if (updatedParticipants.length === 0) {
        await updateDoc(groupRef, {
          currentCall: {
            active: false,
            startedBy: null,
            participants: []
          }
        });
      } else {
        await updateDoc(groupRef, {
          'currentCall.participants': updatedParticipants
        });
      }
    } catch (error) {
      console.error("Error leaving call:", error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-md" />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Call Info Section */}
        <div className="p-8 sm:p-12 text-center flex flex-col items-center">
          <div className="relative mb-8">
            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 ${isMuted ? 'border-red-500' : 'border-indigo-500'} shadow-xl animate-pulse transition-colors duration-300`}>
               <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                 {group.name.charAt(0).toUpperCase()}
               </div>
            </div>
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${isMuted ? 'bg-red-600' : 'bg-indigo-600'} text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg transition-colors`}>
              {isMuted ? 'Muted' : 'On Call'}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h2>
          <p className="text-indigo-600 dark:text-indigo-400 font-mono text-lg mb-6">{formatTime(callDuration)}</p>
          
          <div className="flex -space-x-3 mb-8">
            {activeParticipants.map((p, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold shadow-sm" title={p.username}>
                {p.username.charAt(0).toUpperCase()}
              </div>
            ))}
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border-2 border-white dark:border-gray-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              +{activeParticipants.length}
            </div>
          </div>

          <p className="text-gray-500 dark:text-gray-400 text-sm mb-12">
            Secure end-to-end encrypted voice call.
          </p>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-6">
            <button 
              onClick={() => {
                const newState = !isMuted;
                setIsMuted(newState);
                if (localStream) {
                  localStream.getAudioTracks().forEach(track => track.enabled = !newState);
                }
              }}
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
              onClick={onClose}
              className="p-6 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-90 hover:rotate-90 transform duration-300"
              title="End Call"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.984.984 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
              </svg>
            </button>
            <button 
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
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
      </div>

      {/* Remote Audio Rendering */}
      <div className="hidden">
        {Object.entries(remoteStreams).map(([pId, stream]) => (
          <audio 
            key={pId} 
            autoPlay 
            playsInline
            controls={false}
            ref={el => { if (el) el.srcObject = stream; }}
            muted={!isSpeakerOn}
            onCanPlay={() => console.log(`Audio stream for ${pId} is ready`)}
            onError={(e) => console.error(`Audio error for ${pId}:`, e)}
          />
        ))}
      </div>
    </div>
  );
};

export default VoiceCallModal;
