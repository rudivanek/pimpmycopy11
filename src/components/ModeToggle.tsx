import React from 'react';
import { useMode } from '../context/ModeContext';
import { Tooltip } from './ui/Tooltip';
import { Zap, Sliders } from 'lucide-react';

const ModeToggle: React.FC = () => {
  const { isSmartMode, toggleMode } = useMode();

  return (
    <div className="flex items-center justify-start mb-4">
      <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-1 flex">
        <Tooltip 
          content="Simplified mode — shows only essential fields for fast copy generation. Perfect for quick tests or new users."
          delayDuration={300}
        >
          <button
            onClick={() => !isSmartMode && toggleMode()}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isSmartMode
                ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-500 shadow'
                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-pressed={isSmartMode}
          >
            <Zap size={16} className="mr-1.5" />
            Smart Mode
          </button>
        </Tooltip>
        
        <Tooltip 
          content="Full access to all features and options for complete control over copy generation."
          delayDuration={300}
        >
          <button
            onClick={() => isSmartMode && toggleMode()}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              !isSmartMode
                ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-500 shadow'
                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-pressed={!isSmartMode}
          >
            <Sliders size={16} className="mr-1.5" />
            Pro Mode
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default ModeToggle;