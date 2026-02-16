import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc, onSnapshot, serverTimestamp, addDoc, collection, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getIceServers } from '../utils/iceSettings';

const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const { userId, username, profilePic, showNotification } = useAuth();
  
  // Call State
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeCallGroup, setActiveCallGroup] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);

  // WebRTC State
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const peerConnections = useRef({});
  const timerRef = useRef(null);
  const [iceServers, setIceServers] = useState([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]);

  // Fetch ICE servers
  useEffect(() => {
    const fetchIce = async () => {
      try {
        const servers = await getIceServers();
        setIceServers(servers);
      } catch (err) {
        console.warn("ICE settings fetch failed, using defaults", err);
      }
    };
    fetchIce();
  }, []);

  const cleanupConnections = useCallback(() => {
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setCallDuration(0);
    setIsConnecting(true);
  }, [localStream]);

  const leaveCallFirestore = useCallback(async (groupId, participants) => {
    if (!groupId) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      const updatedParticipants = (participants || activeParticipants).filter(p => p.userId !== userId);
      
      if (updatedParticipants.length === 0) {
        await updateDoc(groupRef, {
          currentCall: { active: false, startedBy: null, participants: [] }
        });
      } else {
        await updateDoc(groupRef, {
          'currentCall.participants': updatedParticipants
        });
      }
    } catch (error) {
      console.error("Error leaving call:", error);
    }
  }, [activeParticipants, userId]);

  const endCall = useCallback(async () => {
    const groupId = activeCallGroup?.id;
    const participants = [...activeParticipants];
    
    setIsCallActive(false);
    setActiveCallGroup(null);
    cleanupConnections();
    if (groupId) await leaveCallFirestore(groupId, participants);
  }, [activeCallGroup, activeParticipants, cleanupConnections, leaveCallFirestore]);

  const sendSignalingMessage = async (groupId, targetUserId, data) => {
    const callRef = collection(db, 'groups', groupId, 'calls');
    await addDoc(callRef, {
      ...data,
      from: userId,
      to: targetUserId,
      createdAt: serverTimestamp()
    });
  };

  const createPeerConnection = useCallback((groupId, targetUserId, stream, isInitiator) => {
    const pc = new RTCPeerConnection({ iceServers });
    peerConnections.current[targetUserId] = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage(groupId, targetUserId, { type: 'candidate', candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [targetUserId]: event.streams[0] }));
      setIsConnecting(false);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state with ${targetUserId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setIsConnecting(false);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setIsConnecting(false);
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignalingMessage(groupId, targetUserId, { type: 'offer', offer });
        } catch (e) {
          console.error("Negotiation error:", e);
        }
      };
    }

    return pc;
  }, [iceServers, userId]);

  const handleSignaling = useCallback(async (groupId, stream) => {
    const callRef = collection(db, 'groups', groupId, 'calls');
    return onSnapshot(query(callRef, where('to', '==', userId)), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const fromId = data.from;
          let pc = peerConnections.current[fromId];

          if (data.type === 'offer') {
            if (!pc) pc = createPeerConnection(groupId, fromId, stream, false);
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignalingMessage(groupId, fromId, { type: 'answer', answer });
          } else if (data.type === 'answer' && pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          } else if (data.type === 'candidate' && pc) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      });
    });
  }, [userId, createPeerConnection]);

  const startCall = useCallback(async (group, type = 'voice') => {
    try {
      const isVideo = type === 'video';
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: isVideo 
      });
      
      setLocalStream(stream);
      setIsVideoEnabled(isVideo);
      setActiveCallGroup(group);
      setIsCallActive(true);
      setIsMinimized(false);
      setIsConnecting(true);

      const groupRef = doc(db, 'groups', group.id);
      
      // Cleanup old signaling
      const oldCalls = await getDocs(collection(db, 'groups', group.id, 'calls'));
      oldCalls.forEach(d => deleteDoc(d.ref));

      const currentParticipants = group.currentCall?.participants || [];
      const newParticipants = [
        ...currentParticipants,
        { 
          userId, 
          username, 
          profilePic: profilePic || '', 
          joinedAt: new Date().toISOString(),
          isVideoEnabled: isVideo
        }
      ];

      await updateDoc(groupRef, {
        currentCall: {
          active: true,
          startedBy: group.currentCall?.startedBy || userId,
          participants: newParticipants
        }
      });

      // Connect to others
      currentParticipants.forEach(p => {
        if (p.userId !== userId) createPeerConnection(group.id, p.userId, stream, true);
      });

      // Announcements
      await addDoc(collection(db, 'messages'), {
        groupId: group.id,
        senderId: 'system',
        senderName: 'System',
        text: `${username} ${group.currentCall?.active ? 'joined' : 'started'} a ${type} call`,
        type: 'system',
        createdAt: serverTimestamp()
      });

      // Start duration timer
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);

      // Listen for participant changes
      const unsubscribeParticipants = onSnapshot(groupRef, (snapshot) => {
        const data = snapshot.data();
        if (data?.currentCall?.active) {
          const participants = data.currentCall.participants || [];
          setActiveParticipants(participants);
          
          participants.forEach(p => {
            if (p.userId !== userId && !peerConnections.current[p.userId]) {
              createPeerConnection(group.id, p.userId, stream, false);
            }
          });

          // Check connectivity
          const others = participants.filter(p => p.userId !== userId);
          if (others.length > 0) {
            const anyConnected = Object.values(peerConnections.current).some(pc => 
              pc.connectionState === 'connected' || pc.iceConnectionState === 'connected'
            );
            if (anyConnected) setIsConnecting(false);
          } else {
            setIsConnecting(true);
          }
        } else if (isCallActive) {
          endCall();
        }
      });

      // Listen for signaling
      const unsubscribeSignaling = await handleSignaling(group.id, stream);

      return () => {
        unsubscribeParticipants();
        unsubscribeSignaling();
      };
    } catch (error) {
      console.error("Call initialization failed:", error);
      showNotification("Could not start call - check mic permissions.", "error");
    }
  }, [userId, username, profilePic, createPeerConnection, handleSignaling, isCallActive, endCall, showNotification]);

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !newState);
    }
  };

  const toggleSpeaker = () => setIsSpeakerOn(!isSpeakerOn);
  
  const toggleVideo = useCallback(async () => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      
      // Update Firestore so others know our video status
      if (activeCallGroup) {
        const groupRef = doc(db, 'groups', activeCallGroup.id);
        const updatedParticipants = activeParticipants.map(p => 
          p.userId === userId ? { ...p, isVideoEnabled: videoTrack.enabled } : p
        );
        await updateDoc(groupRef, { 'currentCall.participants': updatedParticipants });
      }
    } else if (!isVideoEnabled) {
      // Try to enable camera if it wasn't started
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        localStream.addTrack(newVideoTrack);
        
        // Notify peer connections
        Object.values(peerConnections.current).forEach(pc => {
          pc.addTrack(newVideoTrack, localStream);
        });
        
        setIsVideoEnabled(true);
      } catch (err) {
        showNotification("Could not access camera", "error");
      }
    }
  }, [localStream, activeCallGroup, activeParticipants, userId, isVideoEnabled, showNotification]);

  const toggleMinimize = () => setIsMinimized(!isMinimized);

  const value = {
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
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    toggleVideo,
    toggleMinimize
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};
