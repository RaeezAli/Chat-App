import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary } from '../../utils/cloudinary';

const CreateGroupModal = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupPic, setGroupPic] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { user, username, userId, showNotification } = useAuth();
  const fileInputRef = React.useRef(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    if (!userId) {
      showNotification("You must have a user profile to create a group.", 'error');
      return;
    }

    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const groupData = {
        name: name.trim(),
        description: description.trim(),
        groupPic: groupPic || '',
        createdBy: userId,
        inviteCode,
        members: [{
          uid: userId,
          name: username,
          role: 'admin'
        }],
        memberUids: [userId],
        createdAt: serverTimestamp(),
      };
      
      console.log("Attempting to create group with data:", groupData);
      const docRef = await addDoc(collection(db, 'groups'), groupData);
      console.log("Group created with ID:", docRef.id);
      
      // System Announcement
      await addDoc(collection(db, 'messages'), {
        groupId: docRef.id,
        senderId: 'system',
        senderName: 'System',
        text: `${username} created the group`,
        type: 'system',
        createdAt: serverTimestamp()
      });

      showNotification(`Group "${name}" created!`, 'success');
      setName('');
      setDescription('');
      setGroupPic('');
      onClose();
    } catch (error) {
      console.error("Detailed error creating group:", error);
      showNotification(`Failed to create group: ${error.message}`, 'error');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { url } = await uploadToCloudinary(file);
      setGroupPic(url);
    } catch (error) {
      console.error("Group logo upload failed:", error);
      showNotification("Logo upload failed.", 'error');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Create New Group</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex flex-col items-center mb-2">
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`relative w-24 h-24 rounded-2xl bg-indigo-50 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden group transition-all ${isUploading ? 'opacity-50' : 'hover:border-indigo-500'}`}
            >
              {groupPic ? (
                <img src={groupPic} alt="Group Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-gray-400 group-hover:text-indigo-500">
                  <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Logo</span>
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner"
              placeholder="e.g. Work Team"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"
              placeholder="What is this group about?"
              rows="3"
            />
          </div>
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 transition-all"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
