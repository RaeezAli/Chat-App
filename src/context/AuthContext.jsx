import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(localStorage.getItem('chat_username') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged will fire again with the new user
        } catch (error) {
          console.error("Error signing in anonymously:", error);
          setLoading(false); // Even on error, we should stop loading eventually
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const saveUsername = (name) => {
    localStorage.setItem('chat_username', name);
    setUsername(name);
  };

  return (
    <AuthContext.Provider value={{ user, username, saveUsername, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
