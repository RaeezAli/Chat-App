import React from 'react'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ChatProvider, useChat } from './context/ChatContext'
import UsernameModal from './components/Auth/UsernameModal'
import ChatBox from './components/Chat/ChatBox'
import Sidebar from './components/Chat/Sidebar'

const ChatContent = () => {
  const { isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  const { mobileShowChat, setMobileChatVisibility } = useChat();

  return (
    <Layout hideFooter>
      <div className="flex h-full w-full bg-white dark:bg-gray-900 overflow-hidden relative md:h-[90vh] md:w-[95vw] md:max-w-7xl md:mx-auto md:rounded-2xl md:shadow-2xl md:border md:border-gray-100 dark:md:border-gray-700 transition-all self-center">
        {/* Sidebar */}
        <div className={`w-full md:w-[35%] lg:w-[30%] h-full transition-all duration-300 ease-in-out ${
          mobileShowChat ? '-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 flex-none' : 'translate-x-0 opacity-100'
        } absolute inset-0 md:relative z-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}>
          <Sidebar />
        </div>

        {/* Chat Area */}
        <div className={`w-full md:w-[65%] lg:w-[70%] h-full transition-all duration-300 ease-in-out ${
          mobileShowChat ? 'translate-x-0 opacity-100' : 'translate-x-full md:translate-x-0 opacity-0 md:opacity-100'
        } absolute inset-0 md:relative z-10 bg-gray-50 dark:bg-gray-900 flex flex-col`}>
          <ChatBox onBack={() => setMobileChatVisibility(false)} />
        </div>
      </div>

      <UsernameModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <ChatContent />
      </ChatProvider>
    </AuthProvider>
  )
}

export default App
