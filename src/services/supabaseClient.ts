import { createClient } from '@supabase/supabase-js';
import { FormData, Customer, CopySession, Template, TokenUsage, StructuredCopyOutput, SavedOutput } from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export function to get the Supabase client
export const getSupabaseClient = () => supabase;

// User authentication functions
export const signUp = async (email: string, password: string) => {
  return supabase.auth.signUp({ email, password });
};

export const signIn = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
};

export const getSession = async () => {
  return supabase.auth.getSession();
};

// Function to get a specific copy session by ID with abort support
export const getCopySession = async (sessionId: string, signal?: AbortSignal) => {
  // Create custom fetch function with abort signal
  if (signal) {
    const fetchWithAbort = async () => {
      // Check if already aborted
      if (signal.aborted) {
        throw new DOMException('Loading aborted by the user', 'AbortError');
      }
      
      return supabase
        .from('pmc_copy_sessions')
        .select('*, customer:customer_id(name)')
        .eq('id', sessionId)
        .single();
    };
    
    // Set up abort handler
    return new Promise((resolve, reject) => {
      // Create abort handler
      const abortHandler = () => {
        reject(new DOMException('Loading aborted by the user', 'AbortError'));
      };
      
      // Add abort listener
      signal.addEventListener('abort', abortHandler, { once: true });
      
      // Execute the fetch
      fetchWithAbort()
        .then(result => {
          signal.removeEventListener('abort', abortHandler);
          resolve(result);
        })
        .catch(error => {
          signal.removeEventListener('abort', abortHandler);
          reject(error);
        });
    });
  }
  
  // Fallback to normal execution without abort handling
  return supabase
    .from('pmc_copy_sessions')
    .select('*, customer:customer_id(name)')
    .eq('id', sessionId)
    .single();
};

// Function to get the latest copy session for a user with abort support
export const getLatestCopySession = async (userId: string, signal?: AbortSignal) => {
  // Create custom fetch function with abort signal
  if (signal) {
    const fetchWithAbort = async () => {
      // Check if already aborted
      if (signal.aborted) {
        throw new DOMException('Loading aborted by the user', 'AbortError');
      }
      
      return supabase
        .from('pmc_copy_sessions')
        .select('*, customer:customer_id(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    };
    
    // Set up abort handler
    return new Promise((resolve, reject) => {
      // Create abort handler
      const abortHandler = () => {
        reject(new DOMException('Loading aborted by the user', 'AbortError'));
      };
      
      // Add abort listener
      signal.addEventListener('abort', abortHandler, { once: true });
      
      // Execute the fetch
      fetchWithAbort()
        .then(result => {
          signal.removeEventListener('abort', abortHandler);
          resolve(result);
        })
        .catch(error => {
          signal.removeEventListener('abort', abortHandler);
          reject(error);
        });
    });
  }
  
  // Fallback to normal execution without abort handling
  return supabase
    .from('pmc_copy_sessions')
    .select('*, customer:customer_id(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
};

// Function to get a specific template by ID with abort support
export const getTemplate = async (templateId: string, signal?: AbortSignal) => {
  // Create custom fetch function with abort signal
  if (signal) {
    const fetchWithAbort = async () => {
      // Check if already aborted
      if (signal.aborted) {
        throw new DOMException('Loading aborted by the user', 'AbortError');
      }
      
      return supabase
        .from('pmc_templates')
        .select('*')
        .eq('id', templateId)
        .single();
    };
    
    // Set up abort handler
    return new Promise((resolve, reject) => {
      // Create abort handler
      const abortHandler = () => {
        reject(new DOMException('Loading aborted by the user', 'AbortError'));
      };
      
      // Add abort listener
      signal.addEventListener('abort', abortHandler, { once: true });
      
      // Execute the fetch
      fetchWithAbort()
        .then(result => {
          signal.removeEventListener('abort', abortHandler);
          resolve(result);
        })
        .catch(error => {
          signal.removeEventListener('abort', abortHandler);
          reject(error);
        });
    });
  }
  
  // Fallback to normal execution without abort handling
  return supabase
    .from('pmc_templates')
    .select('*')
    .eq('id', templateId)
    .single();
};

// Function to check if a user exists by email
export const checkUserExists = async (email: string) => {
  const { data, error } = await supabase
    .from('pmc_users')
    .select('id')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    // PGRST116 is the error code for "no rows returned"
    console.error('Error checking if user exists:', error);
    throw error;
  }
  
  return !!data; // Return true if user exists, false otherwise
};

// Function to create a new user in the pmc_users table
export const createNewUser = async (id: string, email: string, name: string) => {
  const { error } = await supabase
    .from('pmc_users')
    .insert([
      { 
        id, 
        email,
        name: name || email.split('@')[0]
      }
    ]);
  
  if (error) {
    console.error('Error creating new user:', error);
    throw error;
  }
  
  return true;
};

// Function to save token usage data
export const saveTokenUsage = async (
  user_email: string,
  token_usage: number,
  token_cost: number,
  control_executed: string,
  brief_description: string,
  model: string = 'gpt-4o',
  copy_source: string = 'Copy Generator'
) => {
  // First, get the current authenticated user's email to ensure we're using 
  // the exact same format that Supabase has in the JWT token
  try {
    console.log("saveTokenUsage called with user_email:", user_email);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Use the authenticated user's email if available, otherwise fall back to the provided email
    const emailToUse = user?.email || user_email;
    
    console.log('Saving token usage for user:', emailToUse);
    
    return supabase
      .from('pmc_user_tokens_usage')
      .insert([
        {
          user_email: emailToUse,
          token_usage,
          token_cost,
          control_executed,
          brief_description,
          model,
          copy_source
        }
      ]);
  } catch (error) {
    console.error('Error getting authenticated user in saveTokenUsage:', error);
    
    // Fall back to using the provided email
    return supabase
      .from('pmc_user_tokens_usage')
      .insert([
        {
          user_email: user_email,
          token_usage,
          token_cost,
          control_executed,
          brief_description,
          model,
          copy_source
        }
      ]);
  }
};

// Function to get user templates
export const getUserTemplates = async (userId?: string) => {
  if (!userId) {
    console.error('getUserTemplates called without userId');
    return { data: null, error: new Error('User ID is required') };
  }
  
  console.log('getUserTemplates called with userId:', userId);
  
  try {
    const result = await supabase
      .from('pmc_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    console.log('getUserTemplates result:', { 
      dataLength: result.data?.length || 0,
      error: result.error 
    });
    
    if (result.error) {
      console.error('getUserTemplates Supabase error:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('getUserTemplates exception:', error);
    return { data: null, error };
  }
}

// Original implementation kept as backup
export const _getUserTemplates = async (userId?: string) => {
  if (!userId) {
    return { data: null, error: new Error('User ID is required') };
  }
  
  return supabase
    .from('pmc_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

// Function to delete a template
export const deleteTemplate = async (templateId: string) => {
  return supabase
    .from('pmc_templates')
    .delete()
    .eq('id', templateId);
};

// Function to rename a template
export const renameTemplate = async (templateId: string, newName: string) => {
  return supabase
    .from('pmc_templates')
    .update({ template_name: newName })
    .eq('id', templateId);
};

// Function to save or update a template
export const saveTemplate = async (template: Template, existingTemplateId?: string) => {
  // Create a copy of the template with snake_case properties for database columns
  const dbTemplate: any = {
    user_id: template.user_id,
    template_name: template.template_name,
    description: template.description,
    language: template.language,
    tone: template.tone,
    word_count: template.word_count,
    custom_word_count: template.custom_word_count,
    target_audience: template.target_audience,
    key_message: template.key_message,
    desired_emotion: template.desired_emotion,
    call_to_action: template.call_to_action,
    brand_values: template.brand_values,
    keywords: template.keywords,
    context: template.context,
    brief_description: template.brief_description,
    page_type: template.page_type,
    business_description: template.business_description,
    original_copy: template.original_copy,
    template_type: template.template_type,
    competitor_urls: template.competitor_urls,
    product_service_name: template.product_service_name,
    industry_niche: template.industry_niche,
    tone_level: template.tone_level,
    reader_funnel_stage: template.reader_funnel_stage,
    competitor_copy_text: template.competitor_copy_text,
    target_audience_pain_points: template.target_audience_pain_points,
    preferred_writing_style: template.preferred_writing_style,
    language_style_constraints: template.language_style_constraints,
    generatehumanized: template.generateHumanized || template.generatehumanized,
    generatescores: template.generateScores || template.generatescores,
    numberofheadlines: template.numberOfHeadlines || template.numberofheadlines || 3,
    generateHeadlines: template.generateHeadlines || template.generateheadlines,
    numberOfHeadlines: template.numberOfHeadlines || template.numberofheadlines || 3,
    sectionBreakdown: template.sectionBreakdown || template.section_breakdown,
    forceElaborationsExamples: template.forceElaborationsExamples || template.force_elaborations_examples,
    forceKeywordIntegration: template.forceKeywordIntegration || template.force_keyword_integration,
    prioritizeWordCount: template.prioritizeWordCount || false
  };

  if (existingTemplateId) {
    // Update existing template by ID
    const { data, error } = await supabase
      .from('pmc_templates')
      .update(dbTemplate)
      .eq('id', existingTemplateId)
      .select();
    
    return { error, updated: true, id: existingTemplateId };
  } else {
    // Check if a template with this name already exists for this user
    const { data: existingTemplate, error: queryError } = await supabase
      .from('pmc_templates')
      .select('id')
      .eq('user_id', template.user_id)
      .eq('template_name', template.template_name)
      .maybeSingle();

    if (queryError) {
      console.error('Error checking for existing template:', queryError);
      return { error: queryError, updated: false, id: null };
    }

    if (existingTemplate) {
      // Update existing template
      const { error } = await supabase
        .from('pmc_templates')
        .update(dbTemplate)
        .eq('id', existingTemplate.id);
      
      return { error, updated: true, id: existingTemplate.id };
    } else {
      // Insert new template
      const { data, error } = await supabase
        .from('pmc_templates')
        .insert([dbTemplate])
        .select();
      
      return { error, updated: false, id: data?.[0]?.id };
    }
  }
};

// Ensure user exists in the pmc_users table
export const ensureUserExists = async (userId: string, email: string, name?: string) => {
  // Check if user exists
  const { data: existingUser } = await supabase
    .from('pmc_users')
    .select('*')
    .eq('id', userId)
    .single();
    
  // If user doesn't exist, create them
  if (!existingUser) {
    await supabase
      .from('pmc_users')
      .insert([
        { 
          id: userId, 
          email: email,
          name: name || email.split('@')[0]
        }
      ]);
  }
  
  return { id: userId, email };
};

// Customer functions
export const getCustomers = async () => {
  return supabase
    .from('pmc_customers')
    .select('*')
    .order('name');
};

// Updated to include user_id parameter
export const createCustomer = async (name: string, userId: string) => {
  return supabase
    .from('pmc_customers')
    .insert([
      { 
        name, 
        user_id: userId  // Include the user_id to satisfy RLS policy
      }
    ])
    .select()
    .single();
};

// Helper function to convert copy content for storage
const prepareCopyForStorage = (copy: string | StructuredCopyOutput) => {
  if (typeof copy === 'string') {
    return copy;
  }
  return copy; // Supabase JSONB will handle the JSON object
};

// Function to save a copy session
export const saveCopySession = async (data: FormData, improvedCopy: string | StructuredCopyOutput, alternativeCopy?: string | StructuredCopyOutput, sessionId?: string) => {
  try {
    // Get the current authenticated user
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      throw new Error('No authenticated user found. Please log in and try again.');
    }
    
    // Extract required fields from formData
    const {
      customerId,
      outputType,
      briefDescription,
      outputStructure
    } = data;

    // Create input_data object
    const inputData = {
      ...data,
      outputStructure: outputStructure || []
    };

    // If sessionId is provided, update the existing session
    if (sessionId) {
      console.log('Updating existing session:', sessionId);
      
      // Create update object with only the fields that should be updated
      const updateData: any = {};
      
      // Only add fields that are provided and not null/undefined
      if (improvedCopy) {
        updateData.improved_copy = prepareCopyForStorage(improvedCopy);
      }
      
      if (alternativeCopy) {
        updateData.alternative_copy = prepareCopyForStorage(alternativeCopy);
      }
      
      // Always update input_data to ensure latest state is saved
      updateData.input_data = inputData;
      
      return supabase
        .from('pmc_copy_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .eq('user_id', user.id) // Ensure user can only update their own sessions
        .select()
        .single();
    } else {
      // Create a new session
      console.log('Creating new copy session');
      
      return supabase
        .from('pmc_copy_sessions')
        .insert([
          {
            user_id: user.id,
            input_data: inputData,
            improved_copy: prepareCopyForStorage(improvedCopy),
            alternative_copy: alternativeCopy ? prepareCopyForStorage(alternativeCopy) : null,
            customer_id: customerId && customerId !== 'none' && customerId !== '' ? customerId : null,
            output_type: outputType || null,
            brief_description: briefDescription || null,
          },
        ])
        .select()
        .single();
    }
  } catch (error) {
    console.error('Error in saveCopySession:', error);
    throw error;
  }
};

// Function to update a specific copy session field
export const updateCopySessionField = async (
  sessionId: string, 
  fieldName: string, 
  fieldValue: any
) => {
  try {
    // Get the current authenticated user
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      throw new Error('No authenticated user found. Please log in and try again.');
    }
    
    // Create an update object with only the specific field
    const updateData: any = {};
    updateData[fieldName] = fieldValue;
    
    console.log(`Updating session ${sessionId}, field: ${fieldName}`);
    
    return supabase
      .from('pmc_copy_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id) // Ensure user can only update their own sessions
      .select()
      .single();
  } catch (error) {
    console.error(`Error updating copy session field ${fieldName}:`, error);
    throw error;
  }
};

// Function to delete a copy session
export const deleteCopySession = async (sessionId: string) => {
  return supabase
    .from('pmc_copy_sessions')
    .delete()
    .eq('id', sessionId);
};

// Function to get copy sessions for the current user
export const getCopySessions = async () => {
  return supabase
    .from('pmc_copy_sessions')
    .select('*, pmc_customers(name)')
    .order('created_at', { ascending: false });
};

// Function to get user copy sessions
export const getUserCopySessions = async (userId: string) => {
  console.log('getUserCopySessions called with userId:', userId);
  
  try {
    const result = await supabase
      .from('pmc_copy_sessions')
      .select('*, customer:customer_id(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    console.log('getUserCopySessions result:', { 
      dataLength: result.data?.length || 0,
      error: result.error 
    });
    
    if (result.error) {
      console.error('getUserCopySessions Supabase error:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('getUserCopySessions exception:', error);
    return { data: null, error };
  }
}

// Original implementation kept as backup
export const _getUserCopySessions = async (userId: string) => {
  return supabase
    .from('pmc_copy_sessions')
    .select('*, customer:customer_id(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

// Function to get user token usage
export const getUserTokenUsage = async (userEmail: string) => {
  console.log('getUserTokenUsage called with userEmail:', userEmail);
  
  try {
    const result = await supabase
      .from('pmc_user_tokens_usage')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });
    
    console.log('getUserTokenUsage result:', { 
      dataLength: result.data?.length || 0,
      error: result.error 
    });
    
    if (result.error) {
      console.error('getUserTokenUsage Supabase error:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('getUserTokenUsage exception:', error);
    return { data: null, error };
  }
}

// Original implementation kept as backup
export const _getUserTokenUsage = async (userEmail: string) => {
  return supabase
    .from('pmc_user_tokens_usage')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false });
}

// New functions for saved outputs

// Function to get a specific saved output with abort support
export const getSavedOutput = async (outputId: string, signal?: AbortSignal) => {
  // Create custom fetch function with abort signal
  if (signal) {
    const fetchWithAbort = async () => {
      // Check if already aborted
      if (signal.aborted) {
        throw new DOMException('Loading aborted by the user', 'AbortError');
      }
      
      return supabase
        .from('pmc_saved_outputs')
        .select('*, customer:customer_id(name)')
        .eq('id', outputId)
        .single();
    };
    
    // Set up abort handler
    return new Promise((resolve, reject) => {
      // Create abort handler
      const abortHandler = () => {
        reject(new DOMException('Loading aborted by the user', 'AbortError'));
      };
      
      // Add abort listener
      signal.addEventListener('abort', abortHandler, { once: true });
      
      // Execute the fetch
      fetchWithAbort()
        .then(result => {
          signal.removeEventListener('abort', abortHandler);
          resolve(result);
        })
        .catch(error => {
          signal.removeEventListener('abort', abortHandler);
          reject(error);
        });
    });
  }
  
  // Fallback to normal execution without abort handling
  return supabase
    .from('pmc_saved_outputs')
    .select('*, customer:customer_id(name)')
    .eq('id', outputId)
    .single();
};

// Function to save output
export const saveSavedOutput = async (savedOutput: SavedOutput) => {
  try {
    // Get the current authenticated user
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      throw new Error('No authenticated user found. Please log in and try again.');
    }
    
    // Set the user_id to ensure it matches the authenticated user
    savedOutput.user_id = user.id;
    
    return supabase
      .from('pmc_saved_outputs')
      .insert([savedOutput])
      .select()
      .single();
  } catch (error) {
    console.error('Error in saveSavedOutput:', error);
    throw error;
  }
};

// Function to get saved outputs for the current user
export const getUserSavedOutputs = async (userId: string) => {
  console.log('getUserSavedOutputs called with userId:', userId);
  
  try {
    const result = await supabase
      .from('pmc_saved_outputs')
      .select('*, customer:customer_id(name)')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });
    
    console.log('getUserSavedOutputs result:', { 
      dataLength: result.data?.length || 0,
      error: result.error 
    });
    
    if (result.error) {
      console.error('getUserSavedOutputs Supabase error:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('getUserSavedOutputs exception:', error);
    return { data: null, error };
  }
}

// Original implementation kept as backup
export const _getUserSavedOutputs = async (userId: string) => {
  return supabase
    .from('pmc_saved_outputs')
    .select('*, customer:customer_id(name)')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
}

// Function to delete a saved output
export const deleteSavedOutput = async (outputId: string) => {
  return supabase
    .from('pmc_saved_outputs')
    .delete()
    .eq('id', outputId);
};

// Mock data functions for development without Supabase
export const getMockCustomers = (): Customer[] => {
  return [
    { id: 'mock-1', name: 'Acme Corp', created_at: '2023-01-01T00:00:00Z' },
    { id: 'mock-2', name: 'XYZ Industries', created_at: '2023-01-02T00:00:00Z' },
    { id: 'mock-3', name: 'Tech Innovators', created_at: '2023-01-03T00:00:00Z' },
  ];
};

export const getMockCopySessions = (): CopySession[] => {
  return [
    {
      id: 'mock-session-1',
      user_id: 'mock-user',
      input_data: {
        language: 'English',
        tone: 'Professional',
        wordCount: '200-300',
        targetAudience: 'Business professionals',
        inputText: 'Original text for session 1',
      },
      improved_copy: 'Improved copy for session 1',
      alternative_copy: 'Alternative copy for session 1',
      created_at: '2023-01-10T00:00:00Z',
      customer_id: 'mock-1',
      pmc_customers: { name: 'Acme Corp' },
      output_type: 'Website Copy',
      brief_description: 'Homepage redesign',
    },
    {
      id: 'mock-session-2',
      user_id: 'mock-user',
      input_data: {
        language: 'English',
        tone: 'Casual',
        wordCount: '100-200',
        targetAudience: 'General public',
        inputText: 'Original text for session 2',
      },
      improved_copy: 'Improved copy for session 2',
      alternative_copy: null,
      created_at: '2023-01-15T00:00:00Z',
      customer_id: 'mock-2',
      pmc_customers: { name: 'XYZ Industries' },
      output_type: 'Email Campaign',
      brief_description: 'Product launch',
    },
  ];
};

// Function to get mock token usage data
export const getMockTokenUsage = (): TokenUsage[] => {
  return [
    {
      id: 'mock-token-1',
      user_email: 'user@example.com',
      token_usage: 3245,
      token_cost: 0.006490,
      usage_date: '2023-05-10',
      created_at: '2023-05-10T14:23:10Z',
      control_executed: 'generate_create_copy',
      brief_description: 'Website homepage copy',
      model: 'deepseek-chat',
      copy_source: 'Copy Generator'
    },
    {
      id: 'mock-token-2',
      user_email: 'user@example.com',
      token_usage: 2134,
      token_cost: 0.004268,
      usage_date: '2023-05-12',
      created_at: '2023-05-12T09:45:22Z',
      control_executed: 'generate_improve_copy',
      brief_description: 'Product description refinement',
      model: 'gpt-4o',
      copy_source: 'Copy Generator'
    },
    {
      id: 'mock-token-3',
      user_email: 'user@example.com',
      token_usage: 1567,
      token_cost: 0.003134,
      usage_date: '2023-05-15',
      created_at: '2023-05-15T16:12:05Z',
      control_executed: 'evaluate_prompt',
      brief_description: 'SEO content analysis',
      model: 'deepseek-chat',
      copy_source: 'Copy Generator'
    },
    {
      id: 'mock-token-4',
      user_email: 'user@example.com',
      token_usage: 4321,
      token_cost: 0.008642,
      usage_date: '2023-05-18',
      created_at: '2023-05-18T11:30:45Z',
      control_executed: 'generate_humanized_version',
      brief_description: 'Email campaign humanization',
      model: 'gpt-4-turbo',
      copy_source: 'Copy Generator'
    },
    {
      id: 'mock-token-5',
      user_email: 'user@example.com',
      token_usage: 1876,
      token_cost: 0.003752,
      usage_date: '2023-05-20',
      created_at: '2023-05-20T15:20:30Z',
      control_executed: 'generate_headlines',
      brief_description: 'Blog post headline options',
      model: 'gpt-3.5-turbo',
      copy_source: 'Copy Generator'
    }
  ];
};

// Function to get mock saved outputs
export const getMockSavedOutputs = (): SavedOutput[] => {
  return [
    {
      id: 'mock-saved-1',
      user_id: 'mock-user',
      customer_id: 'mock-1',
      customer: { id: 'mock-1', name: 'Acme Corp', created_at: '2023-01-01T00:00:00Z' },
      brief_description: 'Homepage copy with Steve Jobs voice',
      language: 'English',
      tone: 'Professional',
      model: 'gpt-4o',
      selected_persona: 'Steve Jobs',
      input_snapshot: {
        tab: 'create',
        language: 'English',
        tone: 'Professional',
        wordCount: 'Medium: 100-200',
        competitorUrls: [],
        businessDescription: 'Mock business description for saved output',
        isLoading: false,
        model: 'gpt-4o'
      } as FormData,
      output_content: {
        improvedCopy: 'Mock improved copy',
        alternativeCopy: 'Mock alternative copy',
        humanizedCopy: 'Mock humanized copy',
        alternativeHumanizedCopy: 'Mock alternative humanized copy',
        restyledImprovedCopy: 'Mock Steve Jobs improved copy',
        headlines: ['Headline 1', 'Headline 2', 'Headline 3']
      },
      saved_at: '2023-06-01T10:30:00Z'
    },
    {
      id: 'mock-saved-2',
      user_id: 'mock-user',
      brief_description: 'Product page copy in Spanish',
      language: 'Spanish',
      tone: 'Friendly',
      model: 'deepseek-chat',
      input_snapshot: {
        tab: 'create',
        language: 'Spanish',
        tone: 'Friendly',
        wordCount: 'Short: 50-100',
        competitorUrls: [],
        businessDescription: 'Mock Spanish business description for saved output',
        isLoading: false,
        model: 'deepseek-chat'
      } as FormData,
      output_content: {
        improvedCopy: 'Mock Spanish improved copy',
        alternativeCopy: 'Mock Spanish alternative copy',
        headlines: ['Spanish Headline 1', 'Spanish Headline 2', 'Spanish Headline 3']
      },
      saved_at: '2023-06-02T15:45:00Z'
    }
  ];
};

export default supabase;