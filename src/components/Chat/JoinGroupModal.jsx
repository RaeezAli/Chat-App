import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, arrayUnion, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const JoinGroupModal = ({ isOpen, onClose }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, username, userId, showNotification } = useAuth();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim() || loading) return;

    if (!userId) {
      showNotification("You must have a user profile to join a group.", 'error');
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'groups'), where('inviteCode', '==', inviteCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showNotification("Invalid invite code.", 'error');
      } else {
        const groupDoc = querySnapshot.docs[0];
        const groupData = groupDoc.data();
        const groupRef = doc(db, 'groups', groupDoc.id);

        // Check if user is already a member
        if (groupData.memberUids?.includes(userId)) {
          showNotification("You are already a member of this group.", 'warning');
          setInviteCode('');
          onClose();
          return;
        }
        
        await updateDoc(groupRef, {
          members: arrayUnion({
            uid: userId,
            name: username,
            role: 'member'
          }),
          memberUids: arrayUnion(userId)
        });
        
        // System Announcement
        await addDoc(collection(db, 'messages'), {
          groupId: groupDoc.id,
          senderId: 'system',
          senderName: 'System',
          text: `${username} joined the group`,
          type: 'system',
          createdAt: serverTimestamp()
        });

        showNotification(`Welcome to ${groupData.name}!`, 'success');
        setInviteCode('');
        onClose();
      }
    } catch (error) {
      console.error("Detailed error joining group:", error);
      showNotification(`Failed to join group: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-transparent dark:border-gray-800">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Join Group</h2>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-center text-xl font-mono uppercase dark:text-white transition-colors"
              placeholder="ABCDEF"
              maxLength={6}
              required
            />
          </div>
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinGroupModal;
