import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [activeGroup, setActiveGroup] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const handleSelectGroup = useCallback((group) => {
    setActiveGroup(group);
    setMobileShowChat(true);
  }, []);

  const handleLeaveOrDelete = useCallback(() => {
    setActiveGroup(null);
    setMobileShowChat(false);
  }, []);

  const setMobileChatVisibility = useCallback((visible) => {
    setMobileShowChat(visible);
  }, []);

  const value = useMemo(() => ({
    activeGroup,
    mobileShowChat,
    handleSelectGroup,
    handleLeaveOrDelete,
    setMobileChatVisibility
  }), [activeGroup, mobileShowChat, handleSelectGroup, handleLeaveOrDelete, setMobileChatVisibility]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
