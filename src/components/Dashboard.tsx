import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserCopySessions, deleteCopySession, getUserTokenUsage, getUserTemplates, deleteTemplate, getUserSavedOutputs, deleteSavedOutput } from '../services/supabaseClient';
import { CopySession, TokenUsage, Template, SavedOutput } from '../types';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Edit, Eye, Trash2, AlertCircle, DollarSign, BarChart, FileText, LayoutDashboard, Database, Save } from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useFormState';

type TabType = 'sessions' | 'templates' | 'tokens' | 'outputs';

interface DashboardProps {
  userId: string;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  userId, 
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [sessions, setSessions] = useState<CopySession[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage[]>([]);
  const [savedOutputs, setSavedOutputs] = useState<SavedOutput[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingTokens, setLoadingTokens] = useState<boolean>(true);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);
  const [loadingSavedOutputs, setLoadingSavedOutputs] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { loadFormStateFromTemplate } = useFormState();
  
  // Group token usage by model with stats
  const tokenUsageByModel = React.useMemo(() => {
    if (!tokenUsage.length) return [];
    
    const groupedByModel: Record<string, {
      model: string,
      count: number,
      totalTokens: number,
      totalCost: number
    }> = {};
    
    tokenUsage.forEach(record => {
      const model = record.model || 'unknown';
      if (!groupedByModel[model]) {
        groupedByModel[model] = {
          model,
          count: 0,
          totalTokens: 0,
          totalCost: 0
        };
      }
      
      groupedByModel[model].count++;
      groupedByModel[model].totalTokens += record.token_usage;
      groupedByModel[model].totalCost += record.token_cost;
    });
    
    return Object.values(groupedByModel).sort((a, b) => b.totalTokens - a.totalTokens);
  }, [tokenUsage]);
  
  // Calculate token usage stats
  const tokenStats = React.useMemo(() => {
    if (!tokenUsage.length) return { totalTokens: 0, totalCost: 0, avgTokensPerRequest: 0 };
    
    const totalTokens = tokenUsage.reduce((sum, record) => sum + record.token_usage, 0);
    const totalCost = tokenUsage.reduce((sum, record) => sum + record.token_cost, 0);
    const avgTokensPerRequest = Math.round(totalTokens / tokenUsage.length);
    
    return { totalTokens, totalCost, avgTokensPerRequest };
  }, [tokenUsage]);
  
  // Load user's copy sessions
  useEffect(() => {
    const fetchSessions = async () => {
      console.log('Fetching sessions for userId:', userId);
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await getUserCopySessions(userId);
        console.log('Sessions fetch result:', { data, error });
        
        if (error) throw error;
        
        if (data) {
          setSessions(data);
          console.log('Sessions set successfully, count:', data.length);
        }
      } catch (err) {
        console.error('Error fetching user sessions:', err);
        setError('Failed to load your sessions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, [userId]);
  
  // Load user's token usage data
  useEffect(() => {
    const fetchTokenUsage = async () => {
      console.log('Fetching token usage, active tab:', activeTab);
      // Only fetch token data if the tokens tab is active or being switched to
      if (activeTab !== 'tokens') return;

      try {
        setLoadingTokens(true);
        
        // Get the user's email from the current user object
        const userEmail = currentUser?.email;
        console.log('Using email for token usage:', userEmail);
        
        if (userEmail) {
          const { data: tokenData, error: tokenError } = await getUserTokenUsage(userEmail);
          console.log('Token usage fetch result:', { 
            dataLength: tokenData?.length || 0,
            error: tokenError 
          });
          
          if (tokenError) throw tokenError;
          
          if (tokenData) {
            setTokenUsage(tokenData);
            console.log('Token usage set successfully, count:', tokenData.length);
          }
        }
      } catch (err) {
        console.error('Error fetching token usage:', err);
        // Don't show error toast for token usage - it's not critical
      } finally {
        setLoadingTokens(false);
      }
    };
    
    fetchTokenUsage();
  }, [activeTab, currentUser?.email]);
  
  // Load user's templates
  useEffect(() => {
    const fetchTemplates = async () => {
      console.log('Fetching templates, active tab:', activeTab);
      // Only fetch templates if the templates tab is active or being switched to
      if (activeTab !== 'templates') return;
      
      try {
        setLoadingTemplates(true);
        console.log('Fetching templates for userId:', userId);
        
        const { data, error } = await getUserTemplates(userId);
        console.log('Templates fetch result:', { 
          dataLength: data?.length || 0,
          error 
        });
        
        if (error) throw error;
        
        if (data) {
          setTemplates(data);
          console.log('Templates set successfully, count:', data.length);
        }
      } catch (err) {
        console.error('Error fetching user templates:', err);
        toast.error('Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    fetchTemplates();
  }, [activeTab, userId]);

  // Load user's saved outputs
  useEffect(() => {
    const fetchSavedOutputs = async () => {
      console.log('Fetching saved outputs, active tab:', activeTab);
      // Only fetch saved outputs if the outputs tab is active or being switched to
      if (activeTab !== 'outputs') return;
      
      try {
        setLoadingSavedOutputs(true);
        console.log('Fetching saved outputs for userId:', userId);
        
        const { data, error } = await getUserSavedOutputs(userId);
        console.log('Saved outputs fetch result:', { 
          dataLength: data?.length || 0,
          error 
        });
        
        if (error) throw error;
        
        if (data) {
          setSavedOutputs(data);
          console.log('Saved outputs set successfully, count:', data.length);
        }
      } catch (err) {
        console.error('Error fetching saved outputs:', err);
        toast.error('Failed to load saved outputs');
      } finally {
        setLoadingSavedOutputs(false);
      }
    };
    
    fetchSavedOutputs();
  }, [activeTab, userId]);

  // Handle delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        const { error } = await deleteCopySession(sessionId);
        
        if (error) throw error;
        
        // Update sessions state
        setSessions(sessions.filter(session => session.id !== sessionId));
        
        toast.success('Session deleted successfully');
      } catch (err) {
        console.error('Error deleting session:', err);
        toast.error('Failed to delete session');
      }
    }
  };
  
  // Handle delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        const { error } = await deleteTemplate(templateId);
        
        if (error) throw error;
        
        // Update templates state
        setTemplates(templates.filter(template => template.id !== templateId));
        
        toast.success('Template deleted successfully');
      } catch (err) {
        console.error('Error deleting template:', err);
        toast.error('Failed to delete template');
      }
    }
  };
  
  // Handle delete saved output
  const handleDeleteSavedOutput = async (outputId: string) => {
    if (window.confirm('Are you sure you want to delete this saved output?')) {
      try {
        const { error } = await deleteSavedOutput(outputId);
        
        if (error) throw error;
        
        // Update savedOutputs state
        setSavedOutputs(savedOutputs.filter(output => output.id !== outputId));
        
        toast.success('Saved output deleted successfully');
      } catch (err) {
        console.error('Error deleting saved output:', err);
        toast.error('Failed to delete saved output');
      }
    }
  };
  
  // Handle load template
  const handleLoadTemplate = (templateId: string) => {
    console.log('Loading template with ID:', templateId);

    // Then navigate to the app with the template ID
    navigate(`/app?templateId=${templateId}`);
  };
  
  // Handle load saved output
  const handleViewSavedOutput = (outputId: string) => {
    // Then navigate to the app with the saved output ID
    navigate(`/app?savedOutputId=${outputId}`);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>
        
        {/* Tab navigation */}
        <div className="flex border-b border-gray-300 dark:border-gray-800 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'sessions'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent hover:text-gray-700 dark:hover:text-gray-300 text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('sessions')}
          >
            <div className="flex items-center">
              <FileText size={16} className="mr-1.5" />
              Copy Sessions
            </div>
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'templates'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent hover:text-gray-700 dark:hover:text-gray-300 text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            <div className="flex items-center">
              <LayoutDashboard size={16} className="mr-1.5" />
              Templates
            </div>
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'outputs'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent hover:text-gray-700 dark:hover:text-gray-300 text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('outputs')}
          >
            <div className="flex items-center">
              <Save size={16} className="mr-1.5" />
              Saved Outputs
            </div>
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'tokens'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent hover:text-gray-700 dark:hover:text-gray-300 text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('tokens')}
          >
            <div className="flex items-center">
              <Database size={16} className="mr-1.5" />
              Token Consumption
            </div>
          </button>
        </div>
        
        {/* Sessions Tab Content */}
        {activeTab === 'sessions' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold mb-4">Your Copy Sessions</h2>
            
            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-300 px-4 py-3 rounded-md mb-4 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <LoadingSpinner size="md" color="primary" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">You don't have any copy sessions yet.</p>
                <button
                  className="mt-4 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-md transition-colors"
                  onClick={() => navigate('/app')}
                >
                  Create Your First Copy
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden">
                    <div className="p-4">
                      <div className="flex flex-wrap justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            {session.brief_description || 'Untitled Copy'}
                          </h3>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {formatDate(session.created_at)}
                            {session.customer?.name && ` • ${session.customer.name}`}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              navigate(`/app?sessionId=${session.id}`);
                            }}
                            className="text-primary-600 hover:text-primary-500 p-2"
                            title="View this copy session"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="text-red-600 hover:text-red-500 p-2"
                            title="Delete this copy session"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {session.input_data.language || 'English'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {session.input_data.tone || 'Professional'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.input_data.tab === 'create' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        }`}>
                          {session.input_data.tab === 'create' ? 'Create' : 'Improve'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {session.input_data.tab === 'create' 
                          ? (session.input_data.businessDescription || 'No business description provided').substring(0, 150) + '...'
                          : (session.input_data.originalCopy || 'No original copy provided').substring(0, 150) + '...'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Templates Tab Content */}
        {activeTab === 'templates' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold mb-4">Your Templates</h2>
            
            {loadingTemplates ? (
              <div className="flex justify-center items-center h-24">
                <LoadingSpinner size="md" color="primary" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">You don't have any saved templates yet.</p>
                <button
                  className="mt-4 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-md transition-colors"
                  onClick={() => navigate('/app')}
                >
                  Create Your First Template
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden">
                    <div className="p-4">
                      <div className="flex flex-wrap justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            {template.template_name}
                          </h3>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {formatDate(template.created_at || '')}
                            {template.description && (
                              <div className="mt-1">{template.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleLoadTemplate(template.id!)}
                            className="text-primary-600 hover:text-primary-500 p-2"
                            title="Use this template"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id!)}
                            className="text-red-600 hover:text-red-500 p-2"
                            title="Delete this template"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {template.language}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {template.tone}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.template_type === 'create' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        }`}>
                          {template.template_type === 'create' ? 'Create' : 'Improve'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {template.template_type === 'create' 
                          ? (template.business_description || 'No business description provided').substring(0, 150) + '...'
                          : (template.original_copy || 'No original copy provided').substring(0, 150) + '...'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved Outputs Tab Content */}
        {activeTab === 'outputs' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold mb-4">Your Saved Outputs</h2>
            
            {loadingSavedOutputs ? (
              <div className="flex justify-center items-center h-24">
                <LoadingSpinner size="md" color="primary" />
              </div>
            ) : savedOutputs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">You don't have any saved outputs yet.</p>
                <button
                  className="mt-4 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-md transition-colors"
                  onClick={() => navigate('/app')}
                >
                  Generate and Save Your First Output
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {savedOutputs.map((output) => (
                  <div key={output.id} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden">
                    <div className="p-4">
                      <div className="flex flex-wrap justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            {output.brief_description}
                          </h3>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {formatDate(output.saved_at || '')}
                            {output.customer?.name && ` • ${output.customer.name}`}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewSavedOutput(output.id!)}
                            className="text-primary-600 hover:text-primary-500 p-2"
                            title="View this saved output"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSavedOutput(output.id!)}
                            className="text-red-600 hover:text-red-500 p-2"
                            title="Delete this saved output"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {output.language}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {output.tone}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {output.model}
                        </span>
                        {output.selected_persona && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                            {output.selected_persona}'s Voice
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          output.input_snapshot?.tab === 'create' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        }`}>
                          {output.input_snapshot?.tab === 'create' ? 'Create' : 'Improve'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {/* Display a preview of the content */}
                        {typeof output.output_content.improvedCopy === 'string'
                          ? output.output_content.improvedCopy.substring(0, 150) + '...'
                          : typeof output.output_content.improvedCopy === 'object' && output.output_content.improvedCopy.headline
                            ? output.output_content.improvedCopy.headline
                            : 'Saved output content'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Token Consumption Tab Content */}
        {activeTab === 'tokens' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold mb-4">Token Consumption</h2>
            
            {/* Token Usage Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart className="h-5 w-5 mr-2 text-primary-500" />
                    Total Tokens Used
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTokens ? (
                    <LoadingSpinner size="sm\" color="primary" />
                  ) : (
                    <p className="text-3xl font-bold">
                      {tokenStats.totalTokens.toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {tokenStats.avgTokensPerRequest.toLocaleString()} tokens/request avg
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-primary-500" />
                    Total Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTokens ? (
                    <LoadingSpinner size="sm\" color="primary" />
                  ) : (
                    <p className="text-3xl font-bold">
                      {formatCurrency(tokenStats.totalCost)}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Based on current API pricing
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart className="h-5 w-5 mr-2 text-primary-500" />
                    Request Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTokens ? (
                    <LoadingSpinner size="sm\" color="primary" />
                  ) : (
                    <p className="text-3xl font-bold">
                      {tokenUsage.length.toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Total API requests made
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Token Usage By Model */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Usage by Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {loadingTokens ? (
                  <div className="flex justify-center items-center h-24">
                    <LoadingSpinner size="md\" color="primary" />
                  </div>
                ) : tokenUsageByModel.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No model usage data available</p>
                ) : (
                  tokenUsageByModel.map(model => (
                    <Card key={model.model}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{model.model}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Requests:</span>
                          <span className="font-medium">{model.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Tokens:</span>
                          <span className="font-medium">{model.totalTokens.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                          <span className="font-medium">{formatCurrency(model.totalCost)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* All Token Usage */}
            <div>
              <h3 className="text-lg font-semibold mb-4">All Token Usage</h3>
              {loadingTokens ? (
                <div className="flex justify-center items-center h-24">
                  <LoadingSpinner size="md" color="primary" />
                </div>
              ) : tokenUsage.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No token usage data available</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-800">
                  <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                    <thead className="bg-gray-100 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Feature</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Model</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tokens</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-black divide-y divide-gray-300 dark:divide-gray-800">
                      {tokenUsage.map(record => (
                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 text-xs">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                            {formatDate(record.created_at || '')}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {record.brief_description || 'No description'}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {record.copy_source || 'Copy Generator'}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {record.control_executed.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {record.model || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                            {record.token_usage.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                            {formatCurrency(record.token_cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;