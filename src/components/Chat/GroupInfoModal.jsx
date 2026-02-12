import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc, arrayRemove, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const GroupInfoModal = ({ isOpen, onClose, group, onLeaveOrDelete }) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !group) return null;

  const isAdmin = group.members?.find(m => m.uid === user.uid)?.role === 'admin';
  const membersCount = group.members?.length || 0;

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;

    try {
      const groupRef = doc(db, 'groups', group.id);
      const currentUserMember = group.members.find(m => m.uid === user.uid);
      
      await updateDoc(groupRef, {
        members: arrayRemove(currentUserMember),
        memberUids: arrayRemove(user.uid)
      });
      
      onLeaveOrDelete();
      onClose();
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Failed to leave group.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("CRITICAL: Are you sure you want to delete this group? All messages will be permanently removed.")) return;

    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // Delete all messages
      const msgsQuery = query(collection(db, 'messages'), where('groupId', '==', group.id));
      const msgsSnapshot = await getDocs(msgsQuery);
      msgsSnapshot.forEach((msgDoc) => {
        batch.delete(msgDoc.ref);
      });
      
      // Delete group
      batch.delete(doc(db, 'groups', group.id));
      
      await batch.commit();
      
      onLeaveOrDelete();
      onClose();
    } catch (error) {
      console.error("Error deleting group:", error);
      alert(`Failed to delete group: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-3xl font-bold text-indigo-600 shadow-xl border-4 border-white dark:border-gray-800">
            {group.name.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{group.description || "No description provided."}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 font-medium">Invite Code</span>
              <span className="font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">
                {group.inviteCode}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Members ({membersCount})</h3>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                {group.members?.map((member) => (
                  <div key={member.uid} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                        {member.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium dark:text-gray-200 truncate max-w-[150px]">
                        {member.name} {member.uid === user.uid && "(You)"}
                      </span>
                    </div>
                    {member.role === 'admin' && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col space-y-3">
            {isAdmin ? (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Group</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleLeave}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 font-bold rounded-2xl transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Leave Group</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;
