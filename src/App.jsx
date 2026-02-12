import React, { useState } from 'react'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './context/AuthContext'
import UsernameModal from './components/Auth/UsernameModal'
import ChatBox from './components/Chat/ChatBox'
import Sidebar from './components/Chat/Sidebar'

const ChatContent = () => {
  const { username } = useAuth();
  const [activeGroup, setActiveGroup] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const handleSelectGroup = (group) => {
    setActiveGroup(group);
    setMobileShowChat(true);
  };

  const handleLeaveOrDelete = () => {
    setActiveGroup(null);
    setMobileShowChat(false);
  };

  return (
    <Layout hideHeader hideFooter>
      <div className="flex h-screen w-screen bg-white dark:bg-gray-900 overflow-hidden md:relative md:h-[90vh] md:w-[95vw] md:max-w-7xl md:mx-auto md:rounded-2xl md:shadow-2xl md:border md:border-gray-100 dark:md:border-gray-700 transition-all self-center">
        {/* Sidebar */}
        <div className={`w-full md:w-[35%] lg:w-[30%] h-full transition-all duration-300 ease-in-out ${
          mobileShowChat ? '-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 flex-none' : 'translate-x-0 opacity-100'
        } absolute md:relative z-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}>
          <Sidebar 
            activeGroupId={activeGroup?.id} 
            onSelectGroup={handleSelectGroup} 
            onLeaveOrDelete={handleLeaveOrDelete}
          />
        </div>

        {/* Chat Area */}
        <div className={`w-full md:w-[65%] lg:w-[70%] h-full transition-all duration-300 ease-in-out ${
          mobileShowChat ? 'translate-x-0 opacity-100' : 'translate-x-full md:translate-x-0 opacity-0 md:opacity-100'
        } absolute md:relative z-10 bg-gray-50 dark:bg-gray-900 flex flex-col`}>
          <ChatBox 
            activeGroup={activeGroup} 
            onBack={() => setMobileShowChat(false)} 
            onLeaveOrDelete={handleLeaveOrDelete}
          />
        </div>
      </div>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <ChatContent />
    </AuthProvider>
  )
}

export default App
