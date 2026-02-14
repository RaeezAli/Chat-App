import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, doc, writeBatch, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import CreateGroupModal from './CreateGroupModal';
import JoinGroupModal from './JoinGroupModal';
import UsernameModal from '../Auth/UsernameModal';

const GroupListItem = memo(({ group, isActive, onSelect, menuGroupId, setMenuGroupId, onCopyCode, onDelete }) => {
  return (
    <div
      onClick={() => onSelect(group)}
      className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group relative ${
        isActive 
          ? 'bg-indigo-50 dark:bg-indigo-900/40 border-l-4 border-indigo-600' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden ${isActive ? 'bg-indigo-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
          {group.groupPic ? (
            <img src={group.groupPic} alt={group.name} className="w-full h-full object-cover" />
          ) : (
            group.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h3 className={`font-bold truncate ${
            isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'
          }`}>
            {group.name}
          </h3>
          <p className="text-xs text-gray-400 truncate">{group.description || "No description"}</p>
        </div>
      </div>
      
      <div className="relative">
        <button 
          onClick={(e) => { e.stopPropagation(); setMenuGroupId(menuGroupId === group.id ? null : group.id); }}
          className="p-1 opacity-0 group-hover:opacity-100 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>

        {menuGroupId === group.id && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-700 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-600 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <button 
              onClick={(e) => onCopyCode(e, group.inviteCode)}
              className="w-full text-left px-4 py-3 text-xs hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors flex items-center space-x-2 border-b border-gray-100 dark:border-gray-600"
            >
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copy Invite Code</span>
            </button>
            <button 
              onClick={(e) => onDelete(e, group)}
              className="w-full text-left px-4 py-3 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 font-bold transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Group</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const Sidebar = memo(() => {
  const [groups, setGroups] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [menuGroupId, setMenuGroupId] = useState(null);
  const { userId, showNotification } = useAuth();
  const { activeGroup, handleSelectGroup, handleLeaveOrDelete } = useChat();

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'groups'),
      where('memberUids', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsList);
    });

    return () => unsubscribe();
  }, [userId]);

  const copyInviteCode = useCallback((e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    showNotification('Invite code copied to clipboard!', 'success');
    setMenuGroupId(null);
  }, [showNotification]);

  const handleDeleteGroup = useCallback(async (e, group) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${group.name}"? This cannot be undone.`)) return;

    try {
      const batch = writeBatch(db);
      const msgsQuery = query(collection(db, 'messages'), where('groupId', '==', group.id));
      const msgsSnapshot = await getDocs(msgsQuery);
      msgsSnapshot.forEach(mDoc => batch.delete(mDoc.ref));
      batch.delete(doc(db, 'groups', group.id));
      
      await batch.commit();
      setMenuGroupId(null);
      if (handleLeaveOrDelete) handleLeaveOrDelete();
      showNotification('Group deleted successfully.', 'success');
    } catch (error) {
      console.error("Error deleting group:", error);
      showNotification(`Failed to delete group: ${error.message}`, 'error');
    }
  }, [handleLeaveOrDelete, showNotification]);

  const handleAction = useCallback((action) => {
    if (action === 'create') setIsCreateOpen(true);
    if (action === 'join') setIsJoinOpen(true);
  }, []);

  // Placeholder for new state variables that would be needed for the provided snippet
  // These are not part of the original code and are not explicitly requested to be added.
  // For the purpose of this edit, we assume they would be defined elsewhere if this were a full feature change.
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false); // Assuming loading state for groups
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    return groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);


  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden relative">
      {/* Sidebar Header - Fixed */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white">Messages</h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsJoinOpen(true)} // Changed to setIsJoinOpen
              className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Join Group"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button 
              onClick={() => setIsCreateOpen(true)} // Changed to setIsCreateOpen
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
              title="New Group"
            >
              <svg className="w-5 h-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative group">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search groups..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white dark:placeholder-gray-500 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1 bg-white dark:bg-gray-900">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
             <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Syncing...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
             <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
             </div>
             <p className="text-gray-500 dark:text-gray-400 text-sm">No groups found. Create one to start chatting!</p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <GroupListItem 
              key={group.id} 
              group={group} 
              isActive={activeGroup?.id === group.id} // Changed 'active' to 'isActive'
              onSelect={handleSelectGroup} // Changed 'onClick' to 'onSelect'
              menuGroupId={menuGroupId}
              setMenuGroupId={setMenuGroupId}
              onCopyCode={copyInviteCode}
              onDelete={(e) => handleDeleteGroup(e, group)} // Changed to pass event and group
            />
          ))
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <JoinGroupModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
    </div>
  );
});

export default Sidebar;
