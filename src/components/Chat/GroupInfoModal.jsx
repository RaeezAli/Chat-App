import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc, arrayRemove, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import EditGroupModal from './EditGroupModal';

const GroupInfoModal = ({ isOpen, onClose, group, onLeaveOrDelete }) => {
  const { user, userId, showNotification } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !group) return null;

  const isAdmin = group.members?.find(m => m.uid === userId)?.role === 'admin';
  const membersCount = group.members?.length || 0;

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;

    try {
      const groupRef = doc(db, 'groups', group.id);
      const currentUserMember = group.members.find(m => m.uid === userId);
      
      await updateDoc(groupRef, {
        members: arrayRemove(currentUserMember),
        memberUids: arrayRemove(userId)
      });
      
      onLeaveOrDelete();
      onClose();
    } catch (error) {
      console.error("Error leaving group:", error);
      showNotification("Failed to leave group.", 'error');
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
      showNotification(`Failed to delete group: ${error.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] sm:flex sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="absolute inset-x-0 bottom-0 sm:relative sm:inset-auto bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 transform transition-all z-10 max-h-[90vh] flex flex-col border border-transparent dark:border-gray-800">
        {/* Header/Banner */}
        <div className="relative h-24 sm:h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all z-20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-indigo-600 shadow-xl border-4 border-white dark:border-gray-900 transform -translate-y-1 sm:translate-y-0 overflow-hidden">
            {group.groupPic ? (
              <img src={group.groupPic} alt={group.name} className="w-full h-full object-cover" />
            ) : (
              group.name.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-grow scrollbar-hide">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 px-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{group.name}</h2>
              {isAdmin && (
                <button 
                  onClick={() => setShowEdit(true)}
                  className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full"
                  title="Edit Group"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{group.description || "No description provided."}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-black p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 font-medium">Invite Code</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 px-3 py-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 uppercase">
                  {group.inviteCode}
                </span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(group.inviteCode);
                    showNotification('Invite code copied!', 'success');
                  }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Members ({membersCount})</h3>
              <div className="space-y-2">
                {group.members?.map((member) => (
                  <div key={member.uid} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-black hover:bg-white dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-800 shadow-sm sm:shadow-none">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm uppercase">
                        {member.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold dark:text-gray-200 truncate max-w-[150px]">
                        {member.name} {member.uid === userId && "(You)"}
                      </span>
                    </div>
                    {member.role === 'admin' && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                        Admin
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 mb-4 flex flex-col space-y-3">
            {isAdmin ? (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full py-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 font-bold rounded-2xl transition-all flex items-center justify-center space-x-2 border border-red-100 dark:border-red-900/30 active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Team</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleLeave}
                className="w-full py-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 font-bold rounded-2xl transition-all flex items-center justify-center space-x-2 border border-gray-100 dark:border-gray-600 active:scale-[0.98]"
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
      
      {/* Edit Group Modal */}
      <EditGroupModal 
        isOpen={showEdit} 
        onClose={() => setShowEdit(false)} 
        group={group} 
      />
    </div>
  );
};

export default GroupInfoModal;
