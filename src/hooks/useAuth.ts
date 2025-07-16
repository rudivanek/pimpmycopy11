import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient, ensureUserExists } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<any>(null);

  // Helper function to set demo user
  const setDemoUser = () => {
    console.log('Setting demo user due to Supabase connection issues');
    const demoUser = {
      id: 'demo-user-id',
      email: 'demo@example.com',
      user_metadata: {
        name: 'Demo User'
      }
    };
    setCurrentUser(demoUser);
    setUser(demoUser);
    setIsInitialized(true);
  };

  // Public function to allow manual fallback to demo mode
  const fallbackToDemoMode = useCallback(() => {
    setInitError(null);
    setDemoUser();
  }, []);

  // Check if user is logged in - run only once during initialization
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Checking session...');
        // Check if Supabase is enabled
        const supabaseEnabled = import.meta.env.VITE_SUPABASE_ENABLED === 'true';
        
        if (!supabaseEnabled) {
          console.log('Supabase is disabled, using demo user');
          setDemoUser();
          return;
        }
        
        // Wrap all Supabase calls in a try-catch to handle network errors
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Error getting session:', sessionError);
            // Check for various connection/network error types
            if (sessionError.message.includes('Failed to fetch') || 
                sessionError.message.includes('fetch') ||
                sessionError.message.includes('Network') ||
                sessionError.message.includes('network') ||
                sessionError.name === 'TypeError') {
              console.log('Connection failed, setting init error');
              setInitError('Unable to connect to the authentication service. This may be due to network issues or Supabase configuration problems. Please check your internet connection and verify your Supabase settings.');
              setIsInitialized(true);
              return;
            }
            setInitError('Failed to connect to authentication service');
            setIsInitialized(true);
            return;
          }
          
          if (session) {
            console.log('Session found, getting user...');
            try {
              const { data: { user }, error: userError } = await supabase.auth.getUser();
              
              if (userError) {
                console.error('Error getting user:', userError);
                // Check for various connection/network error types
                if (userError.message.includes('Failed to fetch') || 
                    userError.message.includes('fetch') ||
                    userError.message.includes('Network') || 
                    userError.message.includes('network') ||
                    userError.name === 'TypeError') {
                  console.log('User fetch failed, setting init error');
                  setInitError('Unable to connect to the authentication service. This may be due to network issues or Supabase configuration problems. Please check your internet connection and verify your Supabase settings.');
                  setIsInitialized(true);
                  return;
                }
                setInitError('Failed to get user information');
                setIsInitialized(true);
                return;
              }
              
              if (user) {
                console.log('User found:', user.email);
                try {
                  // Ensure the user exists in our pmc_users table
                  await ensureUserExists(user.id, user.email || '', user.user_metadata?.name);
                  setCurrentUser(user);
                  setUser(user);
                } catch (error: any) {
                  console.error('Error ensuring user exists:', error);
                  // If user profile creation fails, still allow login but show warning
                  console.log('User profile setup failed, but allowing login');
                  setCurrentUser(user);
                  setUser(user);
                }
              }
            } catch (userFetchError: any) {
              console.error('Network error fetching user:', userFetchError);
              setInitError('Unable to connect to the authentication service. This may be due to network issues or Supabase configuration problems. Please check your internet connection and verify your Supabase settings.');
              setIsInitialized(true);
              return;
            }
          } else {
            console.log('No session found, user not logged in');
          }
        } catch (supabaseError: any) {
          console.error('Supabase connection error:', supabaseError);
          // Any error connecting to Supabase should show init error instead of falling back
          setInitError('Unable to connect to the authentication service. This may be due to network issues or Supabase configuration problems. Please check your internet connection and verify your Supabase settings.');
          setIsInitialized(true);
          return;
        }
      } catch (error: any) {
        console.error('Error in checkSession:', error);
        // Show init error on any unexpected errors
        setInitError('An unexpected error occurred while initializing the application. Please try again or continue in demo mode.');
        setIsInitialized(true);
        return;
      } finally {
        // Always set isInitialized to true, even if there was an error
        if (!isInitialized) {
          setIsInitialized(true);
        }
      }
    };
    
    // Start the session check
    checkSession();
    
    // Set up auth state change listener only if Supabase is enabled
    const supabaseEnabled = import.meta.env.VITE_SUPABASE_ENABLED === 'true';
    
    if (supabaseEnabled) {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event);
            if (session) {
              setCurrentUser(session.user);
              setUser(session.user);
            } else {
              setCurrentUser(null);
              setUser(null);
            }
          }
        );
        
        return () => {
          // Clean up subscription when component unmounts
          subscription.unsubscribe();
        };
      } catch (authListenerError) {
        console.error('Error setting up auth listener:', authListenerError);
        // Continue without auth listener if it fails
      }
    }
  }, [isInitialized]);

  const handleLogin = useCallback((user: any) => {
    console.log('User logged in:', user.email);
    setCurrentUser(user);
    setUser(user);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      console.log('Logging out...');
      const supabaseEnabled = import.meta.env.VITE_SUPABASE_ENABLED === 'true';
      
      if (supabaseEnabled) {
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('Error signing out from Supabase:', signOutError);
          // Continue with local logout even if Supabase signout fails
        }
      }
      
      setCurrentUser(null);
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear local state even if logout fails
      setCurrentUser(null);
      setUser(null);
      toast.error('Logged out (with errors)');
    }
  }, []);

  return {
    currentUser,
    user,
    setCurrentUser,
    isInitialized,
    initError,
    handleLogin,
    handleLogout,
    fallbackToDemoMode
  };
}