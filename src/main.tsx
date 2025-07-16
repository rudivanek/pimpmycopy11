import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { ModeProvider } from './context/ModeContext';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');
  
  if (rootElement) {
    const root = createRoot(rootElement);
    
    root.render(
      <ThemeProvider>
        <ModeProvider>
          <App />
        </ModeProvider>
      </ThemeProvider>
    );
  } else {
    console.error('Root element not found');
  }
});