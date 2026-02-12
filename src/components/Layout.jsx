import React from 'react'

const Layout = ({ children, hideHeader = false, hideFooter = false }) => {
  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col w-screen overflow-hidden">
      {!hideHeader && (
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10 shadow-sm flex-shrink-0">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              CHAT APP
            </h1>
            <nav className="hidden md:block">
              <ul className="flex space-x-6 text-sm font-semibold text-gray-600 dark:text-gray-300">
                <li className="hover:text-indigo-500 transition-colors cursor-pointer">Dashboard</li>
                <li className="hover:text-indigo-500 transition-colors cursor-pointer">Settings</li>
              </ul>
            </nav>
          </div>
        </header>
      )}
      
      <main className="flex-grow flex items-stretch justify-center overflow-hidden">
        {children}
      </main>

      {!hideFooter && (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Chat App. Powered by Vite + React + Tailwind.
          </div>
        </footer>
      )}
    </div>
  )
}

export default Layout
