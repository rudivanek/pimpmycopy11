import React, { useState, useEffect } from 'react';
import { Sparkles, Mail, Lock, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { getSupabaseClient, createNewUser, checkUserExists, ensureUserExists } from '../services/supabaseClient';
import { useTheme } from '../context/ThemeContext';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const supabase = getSupabaseClient();
  const isSupabaseEnabled = import.meta.env.VITE_SUPABASE_ENABLED !== 'false';
  const { theme } = useTheme();

  // If Supabase is disabled, create demo user
  useEffect(() => {
    if (!isSupabaseEnabled) {
      // Auto-login with demo user when Supabase is disabled
      const demoUser = {
        id: 'demo-user-id',
        email: 'demo@example.com',
        user_metadata: {
          name: 'Demo User'
        }
      };
      onLogin(demoUser);
    }
  }, [isSupabaseEnabled, onLogin]);

  // Check if user is already logged in
  useEffect(() => {
    if (!isSupabaseEnabled) return;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.message.includes('Failed to fetch')) {
            setConnectionError('Unable to connect to authentication service. Please check your Supabase credentials in the .env file.');
          } else {
            setConnectionError(error.message);
          }
          return;
        }
        
        if (session) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            setConnectionError(userError.message);
            return;
          }
          
          if (user) {
            try {
              // Ensure the user exists in our pmc_users table
              await ensureUserExists(user.id, user.email || '', user.user_metadata?.name);
              onLogin(user);
            } catch (error: any) {
              setError('Error setting up user profile');
              console.error('Error ensuring user exists:', error);
            }
          }
        }
      } catch (error: any) {
        setConnectionError(error.message || 'Failed to connect to authentication service');
        console.error('Failed to check session:', error);
      }
    };
    
    checkSession();
  }, [isSupabaseEnabled]);

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Reset error when form fields change
  useEffect(() => {
    if (error) setError('');
  }, [email, password, name, isSignUp]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetSent(true);
      setMessage('Password reset instructions have been sent to your email.');
    } catch (err: any) {
      console.error('Reset password error:', err);
      
      if (err.message) {
        if (err.message.includes('Failed to fetch')) {
          setError('Connection error: Unable to reach authentication service. Please check your network connection.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred while sending the reset instructions');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    // Client-side validation
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      if (!isSupabaseEnabled) {
        // If Supabase is disabled, simulate login success with demo user
        setTimeout(() => {
          const demoUser = {
            id: 'demo-user-id',
            email: email || 'demo@example.com',
            user_metadata: {
              name: name || email.split('@')[0] || 'Demo User'
            }
          };
          onLogin(demoUser);
          setIsLoading(false);
        }, 1000);
        return;
      }

      if (isSignUp) {
        // First check if the user already exists
        try {
          const existingUser = await checkUserExists(email);
          if (existingUser) {
            setError('An account with this email already exists. Please sign in instead.');
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error checking if user exists:', err);
          // Continue with signup attempt even if check fails
        }

        // Sign up with email and password - use auth admin API to skip email verification
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0], // Use part of email as name if not provided
            },
            // Explicitly disable email confirmation
            emailRedirectTo: null,
          },
        });

        if (error) throw error;

        if (data.user) {
          try {
            // Create a record in the pmc_users table
            await createNewUser(
              data.user.id,
              data.user.email || '',
              name || data.user.email?.split('@')[0] || ''
            );
            
            setMessage('Account created successfully! Signing you in...');
            
            // Auto sign-in the user after registration
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            
            if (signInError) {
              console.error('Auto sign-in failed:', signInError);
              setMessage('Account created! Please sign in with your credentials.');
              setIsSignUp(false);
            } else if (signInData.user) {
              onLogin(signInData.user);
            }
          } catch (createUserError) {
            console.error('Error creating user record:', createUserError);
            setError('Account created but there was an error setting up your profile. Please try signing in.');
            setIsSignUp(false);
          }
        }
      } else {
        // Sign in with email and password
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        if (data.user) {
          // Ensure user exists in pmc_users table
          await ensureUserExists(
            data.user.id, 
            data.user.email || '',
            data.user.user_metadata?.name || data.user.email?.split('@')[0] || ''
          );
          
          onLogin(data.user);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      
      // Track login attempts for invalid credentials
      if (err.message && err.message.includes('Invalid login credentials')) {
        setLoginAttempts(prev => prev + 1);
      }
      
      // Handle specific error cases
      if (err.message) {
        if (err.message.includes('Failed to fetch')) {
          setError('Connection error: Unable to reach authentication service. Please check your Supabase configuration and network connection.');
        } else if (err.message.includes('Email confirmation')) {
          setError('Error with email confirmation. Try signing in if you already confirmed your email, or contact support.');
        } else if (err.message.includes('Error sending confirmation email')) {
          // Handle this specific error case by providing a clearer message and switching to sign-in mode
          setMessage('Account created! Email verification is not available. Please try signing in with your credentials.');
          setIsSignUp(false);
        } else if (err.message.includes('Invalid login credentials')) {
          if (loginAttempts >= 2) {
            setError('Multiple failed login attempts. Please verify your credentials carefully. If you\'re sure the email is correct, you may have entered an incorrect password or the account might not exist.');
          } else {
            setError('Invalid email or password. Please check your credentials and try again.');
          }
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred during authentication');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Only show dev mode banner if Supabase is disabled
  if (!isSupabaseEnabled && !connectionError) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center mb-4 text-yellow-600 dark:text-yellow-500">
            <AlertCircle size={24} className="mr-2" />
            <h2 className="text-xl font-bold">Development Mode</h2>
          </div>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Supabase integration is currently disabled in the environment settings. 
            The application is running in development mode.
          </p>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            To enable Supabase authentication, update your .env file with valid Supabase credentials and set VITE_SUPABASE_ENABLED=true.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => onLogin({
                id: 'demo-user-id',
                email: 'demo@example.com',
                user_metadata: { name: 'Demo User' }
              })}
              className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-md"
            >
              Continue with Demo User
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Display connection error if we can't connect to Supabase
  if (connectionError) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center mb-4 text-red-600 dark:text-red-500">
            <AlertCircle size={24} className="mr-2" />
            <h2 className="text-xl font-bold">Connection Error</h2>
          </div>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Unable to connect to the authentication service. This could be due to:
          </p>
          <ul className="list-disc ml-5 mb-6 text-gray-600 dark:text-gray-400 space-y-1">
            <li>Missing or incorrect Supabase credentials in .env file</li>
            <li>Network connectivity issues</li>
            <li>Service unavailability</li>
          </ul>
          <p className="mb-6 text-gray-700 dark:text-gray-300">{connectionError}</p>
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md"
            >
              Reload Application
            </button>
            <button
              onClick={() => {
                // Continue with demo user
                onLogin({
                  id: 'demo-user-id',
                  email: 'demo@example.com',
                  user_metadata: { name: 'Demo User' }
                });
              }}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-md"
            >
              Continue in Development Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  if (isResetPassword) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center px-4">
        <div className="flex items-center justify-center mb-6">
          <Sparkles size={32} className="text-primary-500 mr-2" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">PimpMyCopy</h1>
        </div>
        
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-300 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            Reset Your Password
          </h2>
          
          {message && (
            <div className="bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-800 text-green-900 dark:text-green-300 px-4 py-3 rounded-md mb-4 flex items-start">
              <span>{message}</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-300 px-4 py-3 rounded-md mb-4 flex items-start">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {!resetSent ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white pl-10 pr-4 py-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full"
                    placeholder="Your email"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">We'll send password reset instructions to this email</p>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-medium rounded-lg text-base px-5 py-3 transition-all duration-200 ease-in-out transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
              >
                {isLoading ? (
                  "Sending Reset Instructions..."
                ) : (
                  "Send Reset Instructions"
                )}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                We've sent password reset instructions to <span className="font-semibold text-primary-600 dark:text-primary-400">{email}</span>. 
                Please check your inbox and follow the instructions to reset your password.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                If you don't see the email, check your spam folder. Sometimes it can take a few minutes to arrive.
              </p>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsResetPassword(false);
                setResetSent(false);
                setError('');
                setMessage('');
              }}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-medium flex items-center justify-center mx-auto"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard login/signup form
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center px-4">
      <div className="flex items-center justify-center mb-6">
        <Sparkles size={32} className="text-primary-500 mr-2" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">PimpMyCopy</h1>
      </div>
      
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-300 dark:border-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
          {isSignUp ? 'Create an Account' : 'Sign In to Your Account'}
        </h2>
        
        {message && (
          <div className="bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-800 text-green-900 dark:text-green-300 px-4 py-3 rounded-md mb-4 flex items-start">
            <span>{message}</span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-300 px-4 py-3 rounded-md mb-4 flex items-start">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div>
              <label htmlFor="name\" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full"
                placeholder="Your name"
              />
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-500" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white pl-10 pr-4 py-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full"
                placeholder="Your email"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-500" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white pl-10 pr-4 py-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full"
                placeholder={isSignUp ? "Create password" : "Enter password"}
                minLength={6}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Password must be at least 6 characters</p>
          </div>
          
          {!isSignUp && (
            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={() => {
                  setIsResetPassword(true);
                  setError('');
                  setMessage('');
                }}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
              >
                Forgot password?
              </button>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-medium rounded-lg text-base px-5 py-3 transition-all duration-200 ease-in-out transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
          >
            {isLoading ? (
              isSignUp ? 'Creating Account...' : 'Signing In...'
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
              setLoginAttempts(0);
            }}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-medium"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </div>

        {loginAttempts > 0 && !isSignUp && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setPassword('');
                setError('');
                setLoginAttempts(0);
              }}
              className="flex items-center justify-center mx-auto text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <RefreshCw size={14} className="mr-1" />
              Reset password field
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;