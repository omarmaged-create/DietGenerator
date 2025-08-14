import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { setNutritionixCredentials } from '../services/nutritionixApi';
import { setFatSecretCredentials } from '../services/fatsecretApi';
import { setGoogleAICredentials, isAIAvailable } from '../services/googleAiService';
import { translations, Language } from '../utils/translations';

interface CredentialsSectionProps {
  language: Language;
}

export const CredentialsSection: React.FC<CredentialsSectionProps> = ({ language }) => {
  const t = translations[language];
  const isRTL = language === 'ar';
  
  // State for credentials
  const [nutritionixAppId, setNutritionixAppId] = useState('');
  const [nutritionixApiKey, setNutritionixApiKey] = useState('');
  const [fatSecretConsumerKey, setFatSecretConsumerKey] = useState('');
  const [fatSecretConsumerSecret, setFatSecretConsumerSecret] = useState('');
  const [googleAiApiKey, setGoogleAiApiKey] = useState('');
  
  // State for visibility toggles
  const [showNutritionixKey, setShowNutritionixKey] = useState(false);
  const [showFatSecretKey, setShowFatSecretKey] = useState(false);
  const [showFatSecretSecret, setShowFatSecretSecret] = useState(false);
  const [showGoogleAiKey, setShowGoogleAiKey] = useState(false);
  
  // State for expanded section
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Load credentials from localStorage on mount
  useEffect(() => {
    const savedNutritionixAppId = localStorage.getItem('nutritionix_app_id') || '67cc5cfc';
    const savedNutritionixApiKey = localStorage.getItem('nutritionix_api_key') || 'c3e3e37fd07cf077893fc5e96c47ef29';
    const savedFatSecretConsumerKey = localStorage.getItem('fatsecret_consumer_key') || 'b829e96cbf9448fd931f7d6f8a733ecc';
    const savedFatSecretConsumerSecret = localStorage.getItem('fatsecret_consumer_secret') || 'fae1f68137684764a9bd9df00789ce38';
    const savedGoogleAiApiKey = localStorage.getItem('google_ai_api_key') || 'AIzaSyBrxrdQGq6QFN8zIOjo8TRhLlXT1pA3gSk';
    
    setNutritionixAppId(savedNutritionixAppId);
    setNutritionixApiKey(savedNutritionixApiKey);
    setFatSecretConsumerKey(savedFatSecretConsumerKey);
    setFatSecretConsumerSecret(savedFatSecretConsumerSecret);
    setGoogleAiApiKey(savedGoogleAiApiKey);
    
    // Set credentials in the services
    if (savedNutritionixAppId && savedNutritionixApiKey) {
      setNutritionixCredentials(savedNutritionixAppId, savedNutritionixApiKey);
    }
    if (savedFatSecretConsumerKey && savedFatSecretConsumerSecret) {
      setFatSecretCredentials(savedFatSecretConsumerKey, savedFatSecretConsumerSecret);
    }
    if (savedGoogleAiApiKey) {
      setGoogleAICredentials(savedGoogleAiApiKey);
    }
  }, []);
  
  // Save and apply Nutritionix credentials
  const handleNutritionixSave = () => {
    localStorage.setItem('nutritionix_app_id', nutritionixAppId);
    localStorage.setItem('nutritionix_api_key', nutritionixApiKey);
    setNutritionixCredentials(nutritionixAppId, nutritionixApiKey);
  };
  
  // Save and apply FatSecret credentials
  const handleFatSecretSave = () => {
    localStorage.setItem('fatsecret_consumer_key', fatSecretConsumerKey);
    localStorage.setItem('fatsecret_consumer_secret', fatSecretConsumerSecret);
    setFatSecretCredentials(fatSecretConsumerKey, fatSecretConsumerSecret);
  };
  
  // Save and apply Google AI credentials
  const handleGoogleAiSave = () => {
    localStorage.setItem('google_ai_api_key', googleAiApiKey);
    setGoogleAICredentials(googleAiApiKey);
  };
  
  // Check if credentials are set
  const isNutritionixConfigured = true; // Always configured with hardcoded keys
  const isFatSecretConfigured = true; // Always configured with hardcoded keys  
  const isGoogleAiConfigured = true; // Always configured with hardcoded keys
  
  const getStatusIcon = (isConfigured: boolean) => {
    return isConfigured ? (
      <CheckCircle size={16} className="text-green-600" />
    ) : (
      <AlertCircle size={16} className="text-orange-600" />
    );
  };
  
  const getStatusText = (isConfigured: boolean) => {
    return isConfigured ? 'Configured' : 'Not configured';
  };
  
  const getStatusColor = (isConfigured: boolean) => {
    return isConfigured ? 'text-green-600' : 'text-orange-600';
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${isRTL ? 'rtl' : ''}`}>
      <div 
        className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Key className="text-indigo-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">API Credentials</h2>
            <p className="text-sm text-gray-600">Configure your API keys for food search and AI features</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(isNutritionixConfigured)}
            {getStatusIcon(isFatSecretConfigured)}
            {getStatusIcon(isGoogleAiConfigured)}
          </div>
          <Settings 
            size={20} 
            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
          />
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100">
          <div className="space-y-6 mt-4">
            
            {/* Nutritionix API */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800">Nutritionix API</h3>
                  {getStatusIcon(isNutritionixConfigured)}
                  <span className={`text-sm ${getStatusColor(isNutritionixConfigured)}`}>
                    {getStatusText(isNutritionixConfigured)}
                  </span>
                </div>
                <a 
                  href="https://developer.nutritionix.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Get API Key
                </a>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application ID
                  </label>
                  <input
                    type="text"
                    value={nutritionixAppId}
                    onChange={(e) => setNutritionixAppId(e.target.value)}
                    onBlur={handleNutritionixSave}
                    placeholder="Your Nutritionix App ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showNutritionixKey ? "text" : "password"}
                      value={nutritionixApiKey}
                      onChange={(e) => setNutritionixApiKey(e.target.value)}
                      onBlur={handleNutritionixSave}
                      placeholder="Your Nutritionix API Key"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNutritionixKey(!showNutritionixKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNutritionixKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 mt-2">
                Used for comprehensive food database search with detailed nutritional information.
              </p>
            </div>

            {/* FatSecret API */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800">FatSecret API</h3>
                  {getStatusIcon(isFatSecretConfigured)}
                  <span className={`text-sm ${getStatusColor(isFatSecretConfigured)}`}>
                    {getStatusText(isFatSecretConfigured)}
                  </span>
                </div>
                <a 
                  href="https://platform.fatsecret.com/api/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:text-green-800 underline"
                >
                  Get API Key
                </a>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consumer Key
                  </label>
                  <div className="relative">
                    <input
                      type={showFatSecretKey ? "text" : "password"}
                      value={fatSecretConsumerKey}
                      onChange={(e) => setFatSecretConsumerKey(e.target.value)}
                      onBlur={handleFatSecretSave}
                      placeholder="Your FatSecret Consumer Key"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFatSecretKey(!showFatSecretKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showFatSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consumer Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showFatSecretSecret ? "text" : "password"}
                      value={fatSecretConsumerSecret}
                      onChange={(e) => setFatSecretConsumerSecret(e.target.value)}
                      onBlur={handleFatSecretSave}
                      placeholder="Your FatSecret Consumer Secret"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFatSecretSecret(!showFatSecretSecret)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showFatSecretSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 mt-2">
                Provides additional food database coverage and branded food items.
              </p>
            </div>

            {/* Google AI API */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800">Google AI (Gemini) API</h3>
                  {getStatusIcon(isGoogleAiConfigured)}
                  <span className={`text-sm ${getStatusColor(isGoogleAiConfigured)}`}>
                    {getStatusText(isGoogleAiConfigured)}
                  </span>
                </div>
                <a 
                  href="https://makersuite.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  Get API Key
                </a>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showGoogleAiKey ? "text" : "password"}
                    value={googleAiApiKey}
                    onChange={(e) => setGoogleAiApiKey(e.target.value)}
                    onBlur={handleGoogleAiSave}
                    placeholder="Your Google AI API Key"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleAiKey(!showGoogleAiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showGoogleAiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 mt-2">
                Enables AI-powered features: intelligent food recommendations, diet plan generation, YouTube video analysis, and nutrition chat assistant.
              </p>
            </div>

            {/* Status Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-2">Configuration Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Food Search (Nutritionix + FatSecret)</span>
                  <span className={getStatusColor(isNutritionixConfigured || isFatSecretConfigured)}>
                    {isNutritionixConfigured || isFatSecretConfigured ? 'Available' : 'Limited'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>AI Features</span>
                  <span className={getStatusColor(isGoogleAiConfigured)}>
                    {isGoogleAiConfigured ? 'Available' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              {!isNutritionixConfigured && !isFatSecretConfigured && (
                <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                  <p className="text-sm text-orange-800">
                    ⚠️ No food database APIs configured. Food search will be limited.
                  </p>
                </div>
              )}
              
              {!isGoogleAiConfigured && (
                <div className="mt-3 p-3 bg-purple-100 border border-purple-300 rounded-lg">
                  <p className="text-sm text-purple-800">
                    💡 Configure Google AI API to unlock intelligent food recommendations, diet plan generation, and AI chat features.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};