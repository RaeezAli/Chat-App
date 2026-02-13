import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth, db } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch, addDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(localStorage.getItem('chat_username') || '');
  const [userId, setUserId] = useState(localStorage.getItem('chat_userId') || '');
  const [profilePic, setProfilePic] = useState(localStorage.getItem('chat_profilePic') || '');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null); // { message, type: 'success' | 'error' | 'warning' }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Error signing in anonymously:", error);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []); // Only run once

  useEffect(() => {
    const restoreUser = async () => {
      if (userId && !username && !loading) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            saveUserData(userId, data.username, data.profilePic || '');
          }
        } catch (error) {
          console.error("Error restoring user data:", error);
        }
      }
    };
    restoreUser();
  }, [userId, loading]);

  useEffect(() => {
    // If not loading and no username/userId, open modal
    if (!loading && (!username || !userId)) {
      setIsAuthModalOpen(true);
    } else {
      setIsAuthModalOpen(false);
    }
  }, [loading, username, userId]);

  const saveUserData = useCallback((id, name, pic = '') => {
    localStorage.setItem('chat_userId', id);
    localStorage.setItem('chat_username', name);
    localStorage.setItem('chat_profilePic', pic);
    setUserId(id);
    setUsername(name);
    setProfilePic(pic);
  }, []);

  const checkUserExists = useCallback(async (id) => {
    const userDoc = await getDoc(doc(db, 'users', id));
    return userDoc.exists() ? userDoc.data() : null;
  }, []);

  const signup = useCallback(async (name) => {
    if (!user) {
      throw new Error("Authentication in progress. Please try again in a moment.");
    }

    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    const newId = generateUUID();
    try {
      await setDoc(doc(db, 'users', newId), {
        uid: newId,
        username: name,
        createdAt: serverTimestamp()
      });
      saveUserData(newId, name);
      return newId;
    } catch (error) {
      console.error("Firestore Signup Error:", error);
      throw error;
    }
  }, [user, saveUserData]);

  const login = useCallback(async (id) => {
    try {
      const userData = await checkUserExists(id);
      if (userData) {
        saveUserData(id, userData.username);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Firestore Login Error:", error);
      throw error;
    }
  }, [checkUserExists, saveUserData]);

  const logout = useCallback(() => {
    localStorage.removeItem('chat_userId');
    localStorage.removeItem('chat_username');
    localStorage.removeItem('chat_profilePic');
    setUserId('');
    setUsername('');
    setProfilePic('');
    setIsAuthModalOpen(true);
  }, []);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const updateProfile = useCallback(async (newName, newPic) => {
    if (!userId) return;
    const oldName = username;
    const nameChanged = newName !== oldName;

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', userId), {
        username: newName,
        profilePic: newPic,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (nameChanged) {
        const groupsQuery = query(collection(db, 'groups'), where('memberUids', 'array-contains', userId));
        const groupsSnapshot = await getDocs(groupsQuery);

        groupsSnapshot.forEach((groupDoc) => {
          const groupData = groupDoc.data();
          const updatedMembers = groupData.members.map(m => m.uid === userId ? { ...m, name: newName } : m);
          batch.update(groupDoc.ref, { members: updatedMembers });

          const msgRef = doc(collection(db, 'messages'));
          batch.set(msgRef, {
            groupId: groupDoc.id,
            senderId: 'system',
            senderName: 'System',
            text: `${oldName} renamed to ${newName}`,
            type: 'system',
            createdAt: serverTimestamp()
          });
        });
      }
      await batch.commit();
      saveUserData(userId, newName, newPic);
      showNotification('Profile updated successfully!', 'success');
      return true;
    } catch (error) {
      showNotification('Failed to update profile.', 'error');
      throw error;
    }
  }, [userId, username, saveUserData, showNotification]);

  const contextValue = useMemo(() => ({
    user, 
    username, 
    userId, 
    profilePic,
    isAuthModalOpen, 
    setIsAuthModalOpen,
    signup, 
    login, 
    logout,
    updateProfile,
    checkUserExists,
    loading,
    notification,
    showNotification 
  }), [user, username, userId, profilePic, isAuthModalOpen, signup, login, logout, updateProfile, checkUserExists, loading, notification, showNotification]);

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
