import React from 'react';
import { Sparkles, BookOpen, Zap, Sliders, FileText, Copy, BarChart2, AlignJustify, Lightbulb, PenTool, Settings, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Documentation: React.FC = () => {
  const { theme } = useTheme();

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => {
    return (
      <div className="mb-12 p-6 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg shadow-sm">
        <div className="flex items-center mb-4 pb-2 border-b border-gray-300 dark:border-gray-700">
          <Icon size={24} className="text-primary-500 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <div className="text-gray-700 dark:text-gray-300 space-y-4">
          {children}
        </div>
      </div>
    );
  };

  const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
    return (
      <div className="mt-6 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
          <div className="w-1 h-5 bg-primary-500 mr-2 rounded-full"></div>
          {title}
        </h3>
        <div className="pl-3 space-y-3">
          {children}
        </div>
      </div>
    );
  };

  const Callout = ({ variant = 'info', title, children }: { variant?: 'info' | 'warning' | 'tip'; title: string; children: React.ReactNode }) => {
    const bgColorClass = {
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      tip: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    }[variant];
    
    return (
      <div className={`p-4 rounded-md my-4 border ${bgColorClass}`}>
        <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">{title}</h4>
        <div className="text-gray-700 dark:text-gray-300">
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center mb-8">
          <BookOpen size={28} className="text-primary-500 mr-2" />
          <h1 className="text-3xl font-bold text-black dark:text-white">Documentation</h1>
        </div>
        
        <Section title="Getting Started" icon={Sparkles}>
          <p>
            PimpMyCopy is an advanced AI-powered copy generator designed to help you create and improve marketing content. 
            Whether you're starting from scratch or enhancing existing copy, our tool provides high-quality outputs tailored to your needs.
          </p>
          
          <Callout title="New in Version 1.52">
            <div className="space-y-2">
              <p>
                <strong className="text-primary-500">Configurable Headline Generation</strong> - Choose exactly how many headline options you want to generate
              </p>
              <p>
                <strong className="text-primary-500">Smart Mode / Pro Mode</strong> - Choose between a simplified interface or full control
              </p>
              <p>
                <strong className="text-primary-500">Enhanced UI</strong> - Improved visual presentation with contextual tooltips
              </p>
              <p>
                <strong className="text-primary-500">Integrated Scoring</strong> - Seamless score display with content
              </p>
            </div>
          </Callout>
          
          <SubSection title="Modes (Smart vs. Pro)">
            <div className="space-y-4">
              <p>
                PimpMyCopy offers two distinct modes to match your level of expertise and specific needs:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-blue-300 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
                  <div className="flex items-center mb-2">
                    <Zap size={20} className="text-primary-500 mr-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Smart Mode</h4>
                  </div>
                  <p className="text-sm">
                    A streamlined experience that shows only essential fields. Perfect for:
                  </p>
                  <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
                    <li>Quick copy generation</li>
                    <li>New users</li>
                    <li>Simple projects</li>
                    <li>When you need content fast</li>
                  </ul>
                </div>
                
                <div className="border border-purple-300 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10">
                  <div className="flex items-center mb-2">
                    <Sliders size={20} className="text-primary-500 mr-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Pro Mode</h4>
                  </div>
                  <p className="text-sm">
                    Full access to all advanced settings and options. Ideal for:
                  </p>
                  <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
                    <li>Experienced users</li>
                    <li>Complex projects</li>
                    <li>Fine-tuning every aspect</li>
                    <li>Maximum control over output</li>
                  </ul>
                </div>
              </div>
              
              <p className="text-sm">
                Toggle between modes using the Smart Mode/Pro Mode selector at the top of the page. Your preference is saved for future sessions.
              </p>
            </div>
          </SubSection>
        </Section>
        
        <Section title="Creating New Copy" icon={FileText}>
          <p>
            The "Create New Copy" tab allows you to generate fresh marketing copy based on your business information and requirements.
          </p>
          
          <SubSection title="Required Information">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Business Description:</strong> Provide a detailed description of your business or product.</li>
              <li><strong>Page Type:</strong> Select the type of page you're creating (Homepage, About, Services, etc.).</li>
              <li><strong>Section:</strong> Specify which section of the page you're writing for.</li>
            </ul>
          </SubSection>
          
          <SubSection title="Additional Fields">
            <p>The form includes several additional fields that help improve the quality of generated copy:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Target Audience:</strong> Who will be reading this copy.</li>
              <li><strong>Key Message:</strong> The main point you want to convey.</li>
              <li><strong>Call to Action:</strong> What you want readers to do next.</li>
              <li><strong>Tone:</strong> The writing style (Professional, Friendly, Bold, etc.).</li>
              <li><strong>Language:</strong> Select from multiple supported languages.</li>
              <li><strong>Word Count:</strong> Choose your desired length or specify a custom count.</li>
            </ul>
            
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Pro Mode unlocks additional fields like Brand Values, Keywords, Context, Competitor Copy, Output Structure, and more.
            </p>
          </SubSection>
        </Section>
        
        <Section title="Improving Existing Copy" icon={PenTool}>
          <p>
            The "Improve Existing Copy" tab helps you enhance copy you already have. Simply paste your current content, and our AI will refine it.
          </p>
          
          <SubSection title="How to Get the Best Results">
            <ul className="list-disc pl-5 space-y-1">
              <li>Paste your original copy in the provided field.</li>
              <li>Fill in additional information about target audience, key message, etc.</li>
              <li>Specify what aspects need improvement (clarity, persuasiveness, etc.).</li>
              <li>Select your desired tone and language.</li>
            </ul>
          </SubSection>
          
          <Callout title="Pro Tip" variant="tip">
            Use the <strong>"Evaluate Inputs"</strong> button before generating to get feedback on your inputs. This helps you improve your prompts for better results.
          </Callout>
        </Section>
        
        <Section title="Enhanced Features" icon={Settings}>
          <p>
            PimpMyCopy includes several powerful features to create the perfect content for your needs.
          </p>
          
          <SubSection title="Optional Features">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Generate alternative version(s):</strong> Creates an additional approach with a different angle or tone.
              </li>
              <li>
                <strong>Generate headline options:</strong> Creates customizable number of alternative headline suggestions for your copy.
              </li>
              <li>
                <strong>Generate content scores:</strong> Automatically evaluates the quality of each version and provides improvement suggestions.
              </li>
              <li>
                <strong>Voice Style:</strong> Apply a distinctive communication style modeled after well-known personalities like Steve Jobs, Seth Godin, or others.
              </li>
            </ul>
          </SubSection>
          
          <SubSection title="AI-Assisted Suggestions">
            <p>
              Many fields in the form feature suggestion buttons (<Zap size={16} className="inline-block text-primary-500 mx-1" />) that can help you generate ideas based on your input. 
              Click these buttons to receive AI-generated suggestions for fields like:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Key Message</li>
              <li>Target Audience</li>
              <li>Call to Action</li>
              <li>Brand Values</li>
              <li>Keywords</li>
              <li>And more...</li>
            </ul>
          </SubSection>

          <SubSection title="Templates">
            <p>
              Save your settings as templates to quickly generate similar content in the future:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click "Save Template" after setting up your form.</li>
              <li>Give your template a name and description.</li>
              <li>Load saved templates anytime using the "Load Template" button.</li>
            </ul>
            <p className="mt-2">
              Templates save all your settings, including optional features, allowing you to maintain consistency across similar content pieces.
            </p>
          </SubSection>
        </Section>
        
        <Section title="Results & Output" icon={AlignJustify}>
          <p>
            The results section displays your generated content with several options for reviewing and managing it.
          </p>
          
          <SubSection title="Enhanced Visual Output">
            <p>
              In version 1.52, we've significantly improved the presentation of generated content:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Clear section organization</strong> with improved headings and visual hierarchy
              </li>
              <li>
                <strong>Integrated scoring</strong> - Quality scores now appear with the content they evaluate, separated by a subtle dotted line for visual continuity
              </li>
              <li>
                <strong>Color-coded quality indicators</strong> that provide immediate feedback:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><span className="text-green-600 dark:text-green-400 font-medium">Green (90+)</span>: Excellent quality</li>
                  <li><span className="text-blue-600 dark:text-blue-400 font-medium">Blue (75-89)</span>: Good quality</li>
                  <li><span className="text-yellow-600 dark:text-yellow-400 font-medium">Yellow (60-74)</span>: Needs improvement</li>
                  <li><span className="text-red-600 dark:text-red-400 font-medium">Red (below 60)</span>: Poor quality</li>
                </ul>
              </li>
              <li>
                <strong>Enhanced headline presentation</strong> with numbered formatting and easier copy options
              </li>
              <li>
                <strong>Visual relationship indicators</strong> showing connections between original content and persona-styled variations
              </li>
              <li>
                <strong>Configurable headline generation</strong> allowing you to specify exactly how many headline options you want
              </li>
            </ul>
          </SubSection>
          
          <SubSection title="Available Actions">
            <p>
              Several actions are available in the floating sidebar once you generate content:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Save Output:</strong> Save the current output for later reference.</li>
              <li><strong>Copy as Markdown:</strong> Copy all content as formatted Markdown text.</li>
              <li><strong>Export to Text File:</strong> Download the content as a text file.</li>
              <li><strong>Compare Content Scores:</strong> View a side-by-side comparison of all generated versions.</li>
              <li><strong>View Prompts:</strong> See the exact prompts used to generate the content.</li>
            </ul>
          </SubSection>
          
          <SubSection title="Content Score Analysis">
            <p>
              Each piece of content can be evaluated with detailed scoring:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Overall Score:</strong> A 0-100 rating of the content quality.</li>
              <li><strong>Clarity:</strong> How clear and understandable the content is.</li>
              <li><strong>Persuasiveness:</strong> How effectively it convinces the reader.</li>
              <li><strong>Tone Match:</strong> How well it matches the requested tone.</li>
              <li><strong>Engagement:</strong> How engaging and interesting it is to read.</li>
              <li><strong>Improvement Explanation:</strong> A summary of why and how the content was improved.</li>
            </ul>
          </SubSection>
        </Section>
        
        <Section title="Dashboard Features" icon={BarChart2}>
          <p>
            The dashboard provides access to your saved content and usage statistics:
          </p>
          
          <SubSection title="Tabs and Navigation">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Copy Sessions:</strong> View and access your previous copy generation sessions.</li>
              <li><strong>Templates:</strong> Manage your saved templates.</li>
              <li><strong>Saved Outputs:</strong> View and load your saved copy outputs.</li>
              <li><strong>Token Consumption:</strong> Track your API usage and associated costs.</li>
            </ul>
          </SubSection>
          
          <Callout title="Pro Tip" variant="tip">
            Use templates for consistent brand messaging across different content pieces. Save your brand voice, tone, values, and keywords as a template for quick reuse.
          </Callout>
        </Section>
        
        <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <Lightbulb size={24} className="text-primary-500 mr-2" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tips for Best Results</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Smart Mode Tips</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                <li>Start with a <strong>detailed business description</strong> for better results</li>
                <li>Provide a clear <strong>key message</strong> to focus your copy</li>
                <li>Use the <strong>Evaluate Inputs</strong> button for instant feedback</li>
                <li>Switch to Pro Mode for more granular control as needed</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Pro Mode Tips</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                <li>Use <strong>suggestion buttons</strong> (<Zap size={16} className="inline-block text-primary-500 mx-1" />) to quickly populate fields</li>
                <li>Try different <strong>voice styles</strong> to match your brand personality</li>
                <li>Adjust the <strong>tone level slider</strong> to fine-tune formality</li>
                <li>Add <strong>competitor copy</strong> for comparative improvements</li>
                <li>Customize how many <strong>headlines</strong> you want to generate</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Link
              to="/app"
              className="inline-block bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-6 rounded-lg"
            >
              <RefreshCw size={18} className="inline-block mr-2" />
              Start Creating
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;