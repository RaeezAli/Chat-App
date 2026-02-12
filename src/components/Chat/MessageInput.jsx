import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { uploadToCloudinary } from '../../utils/cloudinary';

const MessageInput = ({ groupId }) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { user, username } = useAuth();
  const pickerRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const handleSendMessage = async (e, mediaData = null) => {
    if (e) e.preventDefault();
    if (!text.trim() && !mediaData) return;
    if (!groupId) return;
    if (!username) {
      alert("Please set a username before sending messages.");
      return;
    }

    try {
      // Structure strictly matches the storage requirements
      const messageData = {
        text: text.trim(),
        senderId: user.uid,
        senderName: username,
        groupId: groupId,
        createdAt: serverTimestamp(), // Critical for persistence and ordering
        ...(mediaData && { 
          mediaUrl: mediaData.url, 
          mediaType: mediaData.type 
        })
      };
      
      setText('');
      setShowEmojiPicker(false);
      
      // Add to Firestore - this will instantly trigger the onSnapshot listener via local cache
      await addDoc(collection(db, 'messages'), messageData);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message.");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const mediaData = await uploadToCloudinary(file);
      await handleSendMessage(null, mediaData);
    } catch (error) {
      alert("Media upload failed. Using demo URL for testing...");
      // Fallback for demo purposes if Cloudinary is not configured
      const mockMedia = {
        url: URL.createObjectURL(file), // Local preview fallback
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'doc'
      };
      await handleSendMessage(null, mockMedia);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addEmoji = (emoji) => {
    setText(prev => prev + emoji.native);
  };

  return (
    <div className="relative p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
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
        </div>

        <div className="flex-grow bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center px-4 py-1 transition-all focus-within:ring-2 focus-within:ring-indigo-500">
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
        </div>

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
      </form>
    </div>
  );
};

export default MessageInput;
