import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { uploadToCloudinary } from '../../utils/cloudinary';

const MessageInput = memo(({ groupId, replyingTo, setReplyingTo }) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const { user, username, userId, profilePic, showNotification } = useAuth();
  const pickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = useCallback(async (e, mediaData = null) => {
    if (e) e.preventDefault();
    if (!text.trim() && !mediaData) return;
    if (!groupId) return;
    if (!username) {
      showNotification("Please set a username before sending messages.", 'error');
      return;
    }

    try {
      const messageData = {
        text: text.trim(),
        senderId: userId,
        senderName: username,
        senderPic: profilePic || '',
        groupId: groupId,
        createdAt: serverTimestamp(),
        ...(mediaData && { 
          mediaUrl: mediaData.url, 
          mediaType: mediaData.type 
        }),
        ...(replyingTo && {
          replyTo: {
            messageId: replyingTo.id,
            text: replyingTo.text,
            senderName: replyingTo.senderName
          }
        })
      };
      
      setText('');
      setShowEmojiPicker(false);
      setReplyingTo(null);
      
      await addDoc(collection(db, 'messages'), messageData);
    } catch (error) {
      console.error("Error sending message:", error);
      showNotification("Failed to send message.", 'error');
    }
  }, [text, groupId, username, userId, profilePic, replyingTo, setReplyingTo, showNotification]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });
        
        setIsUploading(true);
        try {
          const mediaData = await uploadToCloudinary(file);
          await handleSendMessage(null, { ...mediaData, type: 'audio' });
        } catch (error) {
          console.error("Voice upload failed:", error);
          showNotification("Failed to send voice message.", 'error');
        } finally {
          setIsUploading(false);
        }
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      showNotification("Could not access microphone.", 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const mediaData = await uploadToCloudinary(file);
      await handleSendMessage(null, mediaData);
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      showNotification(`Media upload failed: ${error.message}`, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addEmoji = (emoji) => {
    setText(prev => prev + emoji.native);
  };

  return (
    <div className="relative p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-l-4 border-indigo-500 flex items-center justify-between animate-in slide-in-from-bottom duration-200">
          <div className="min-w-0">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Replying to {replyingTo.senderName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-300 truncate">{replyingTo.text || (replyingTo.mediaUrl ? 'Media file' : 'Message')}</p>
          </div>
          <button 
            onClick={() => setReplyingTo(null)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {showEmojiPicker && (
        <div ref={pickerRef} className="absolute bottom-full mb-2 z-50">
          <Picker 
            data={data} 
            onEmojiSelect={addEmoji} 
            theme="auto"
            previewPosition="none"
            skinTonePosition="none"
          />
        </div>
      )}

      {isUploading && (
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-100 overflow-hidden">
          <div className="w-full h-full bg-indigo-600 animate-progress origin-left"></div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-end space-x-2 max-w-7xl mx-auto">
        <div className="flex items-center space-x-1">
          {!isRecording && (
            <>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 transition-colors ${isUploading ? 'text-indigo-400 animate-spin' : 'text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400'}`}
                disabled={isUploading}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,video/*,.pdf,.doc,.docx"
              />
            </>
          )}
        </div>

        <div className={`flex-grow bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center px-4 py-1 transition-all focus-within:ring-2 focus-within:ring-indigo-500 min-h-[44px] ${isRecording ? 'border-2 border-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}>
          {isRecording ? (
            <div className="flex items-center space-x-3 w-full animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium text-red-600 dark:text-red-400 flex-grow">Recording... {formatDuration(recordingDuration)}</span>
              <button 
                type="button"
                onClick={() => { setIsRecording(false); clearInterval(timerRef.current); stopRecording(); }}
                className="text-xs font-bold text-gray-500 hover:text-red-600 uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder={isUploading ? "Uploading media..." : "Type a message..."}
              rows="1"
              className="w-full bg-transparent border-none focus:ring-0 resize-none py-2 text-gray-800 dark:text-gray-100 outline-none max-h-32"
              disabled={isUploading}
            />
          )}
        </div>

        {text.trim() || isUploading ? (
          <button
            type="submit"
            className={`p-3 rounded-full flex-shrink-0 transition-all ${
              text.trim() && !isUploading
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white scale-100 shadow-md transform active:scale-90' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed scale-90'
            }`}
            disabled={!text.trim() || isUploading}
          >
            <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-full flex-shrink-0 transition-all ${
              isRecording 
                ? 'bg-red-600 text-white scale-110 shadow-lg animate-pulse' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
            }`}
          >
            {isRecording ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        )}
      </form>
    </div>
  );
});

export default MessageInput;
