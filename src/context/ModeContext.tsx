import React, { createContext, useContext, useState, useEffect } from 'react';

type ModeContextType = {
  isSmartMode: boolean;
  toggleMode: () => void;
};

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from localStorage, default to true (Smart Mode)
  const [isSmartMode, setIsSmartMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('pimpMyCopy_smartMode');
    return savedMode ? savedMode === 'true' : true;
  });

  // Toggle between Smart Mode and Pro Mode
  const toggleMode = () => {
    setIsSmartMode((prev) => !prev);
  };

  // Save to localStorage whenever the mode changes
  useEffect(() => {
    localStorage.setItem('pimpMyCopy_smartMode', isSmartMode.toString());
  }, [isSmartMode]);

  return (
    <ModeContext.Provider value={{ isSmartMode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
};

// Custom hook to use the mode context
export const useMode = (): ModeContextType => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};