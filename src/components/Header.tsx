import React from 'react';
import { TabType } from '../types';
import { useMode } from '../context/ModeContext'; 
import ModeToggle from './ModeToggle';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="w-full py-6 px-4 sm:px-6 lg:px-8 border-b border-gray-300 dark:border-gray-800">
      <div className="max-w-5xl mx-auto">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-black dark:text-white">Copy Generator</h1>
          
          {/* Smart Mode vs Pro Mode Toggle */}
          <ModeToggle />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              I want to:
            </label>
            
            <div className="flex space-x-4">
              <label className={`flex items-center cursor-pointer ${
                activeTab === 'create' ? 'text-primary-500' : 'text-gray-600 dark:text-gray-400'
              }`}>
                <input 
                  type="radio" 
                  name="copyType" 
                  value="create"
                  checked={activeTab === 'create'}
                  onChange={() => setActiveTab('create')}
                  className="sr-only"
                />
                <span className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${
                  activeTab === 'create' 
                    ? 'border-primary-500' 
                    : 'border-gray-400 dark:border-gray-600'
                }`}>
                  {activeTab === 'create' && (
                    <span className="w-2 h-2 rounded-full bg-primary-500" />
                  )}
                </span>
                Create New Copy
              </label>
              
              <label className={`flex items-center cursor-pointer ${
                activeTab === 'improve' ? 'text-primary-500' : 'text-gray-600 dark:text-gray-400'
              }`}>
                <input 
                  type="radio" 
                  name="copyType" 
                  value="improve"
                  checked={activeTab === 'improve'}
                  onChange={() => setActiveTab('improve')}
                  className="sr-only"
                />
                <span className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${
                  activeTab === 'improve' 
                    ? 'border-primary-500' 
                    : 'border-gray-400 dark:border-gray-600'
                }`}>
                  {activeTab === 'improve' && (
                    <span className="w-2 h-2 rounded-full bg-primary-500" />
                  )}
                </span>
                Improve Existing Copy
              </label>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {activeTab === 'create' ? (
              'Create fresh marketing copy based on your business information and requirements'
            ) : (
              'Refine and enhance your existing copy while maintaining its core message'
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;