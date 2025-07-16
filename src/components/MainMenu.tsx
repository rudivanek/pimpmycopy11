import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, BookOpen } from 'lucide-react'; 
import { LuZap } from "react-icons/lu";
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

interface MainMenuProps {
  userName?: string;
  onLogout?: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ userName, onLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { theme } = useTheme();

  return (
    <header className="w-full py-6 px-4 sm:px-6 lg:px-8 border-b border-gray-300 dark:border-gray-800">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-start justify-between">
          {/* Top row with logo and user controls */}
          <div className="flex items-center justify-between w-full mb-4">
            <div className="flex items-center">
              <LuZap size={28} className="text-primary-500 mr-2" />
              <h1 className="text-3xl font-bold text-black dark:text-white">PimpMyCopy<span className="text-xs ml-1">ver. 10.5</span></h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              
              {userName && (
                <span className="hidden sm:inline-block text-sm font-medium text-gray-600 dark:text-gray-400">
                  {userName}
                </span>
              )}
              
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors duration-200 flex items-center text-sm"
                >
                  <LogOut size={18} className="mr-1.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Bottom row with button-style navigation */}
          <div className="w-full">
            <nav className="flex items-center space-x-2">
            <Link 
              to="/dashboard" 
              className={`flex items-center text-sm font-medium px-4 py-2 rounded-md border transition-colors duration-200 ${
                currentPath === '/dashboard' 
                  ? 'bg-primary-500 text-white border-primary-500' 
                  : 'bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <LayoutDashboard size={18} className="mr-2" />
              Dashboard
            </Link>
            
            <Link 
              to="/app" 
              className={`flex items-center text-sm font-medium px-4 py-2 rounded-md border transition-colors duration-200 ${
                currentPath === '/app' 
                  ? 'bg-primary-500 text-white border-primary-500' 
                  : 'bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <LuZap size={18} className="mr-2" />
              Copy Generator
            </Link>
            
            <Link 
              to="/features" 
              className={`flex items-center text-sm font-medium px-4 py-2 rounded-md border transition-colors duration-200 ${
                currentPath === '/features' 
                  ? 'bg-primary-500 text-white border-primary-500' 
                  : 'bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <LuZap size={18} className="mr-2" />
              Features
            </Link>
            
            <Link 
              to="/documentation" 
              className={`flex items-center text-sm font-medium px-4 py-2 rounded-md border transition-colors duration-200 ${
                currentPath === '/documentation' 
                  ? 'bg-primary-500 text-white border-primary-500' 
                  : 'bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
                <BookOpen size={18} className="mr-2" />
              Documentation
            </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MainMenu;