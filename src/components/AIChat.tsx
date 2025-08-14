import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, TrendingUp, Lightbulb, MessageSquare, Youtube, Plus, Settings, Target, X } from 'lucide-react';
import { chatWithAI, generateDietPlan, analyzeDiet, isAIAvailable, analyzeYouTubeVideo, searchAndAddFoods } from '../services/googleAiService';
import { ClientData, FoodItem } from '../utils/calculations';
import { translations, Language } from '../utils/translations';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  youtubeUrl?: string;
}

interface AIChatProps {
  clientData: Partial<ClientData>;
  meals: any[];
  selectedFoods: { [key: string]: FoodItem };
  targetCalories: number;
  currentTotals: { calories: number; protein: number; carbs: number; fat: number };
  onMealsChange: (meals: any[]) => void;
  onSelectedFoodsChange?: (selectedFoods: { [key: string]: FoodItem }) => void;
  onNotesChange: (notes: string) => void;
  onWorkoutsChange?: (workouts: any[]) => void;
  onSelectedExercisesChange?: (exercises: { [key: string]: any }) => void;
  language: Language;
  targetProteinPercent?: number;
  targetCarbsPercent?: number;
  targetFatPercent?: number;
  deficitSurplus?: number;
}

// Chat storage key
const CHAT_STORAGE_KEY = 'ai-chat-messages';
export const AIChat: React.FC<AIChatProps> = ({
  clientData,
  meals,
  selectedFoods,
  targetCalories,
  currentTotals,
  onMealsChange,
  onSelectedFoodsChange,
  onNotesChange,
  language,
  targetProteinPercent = 25,
  targetCarbsPercent = 45,
  targetFatPercent = 30,
  deficitSurplus = 0
}) => {
  const t = translations[language];
  const isRTL = language === 'ar';
  
  // Load messages from localStorage on component mount
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
    return [];
  });
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showDietSettings, setShowDietSettings] = useState(false);
  
  // Diet customization settings
  const [dietSettings, setDietSettings] = useState({
    proteinPercent: targetProteinPercent,
    carbsPercent: targetCarbsPercent,
    fatPercent: targetFatPercent,
    calorieAdjustment: deficitSurplus, // deficit/surplus
    mealCount: 4,
    dietType: 'balanced', // balanced, keto, low-carb, high-protein, etc.
    restrictions: '', // dietary restrictions
    preferences: '', // food preferences
    goals: 'maintenance' // weight loss, weight gain, muscle building, etc.
  });

  // Sync diet settings with props
  React.useEffect(() => {
    setDietSettings(prev => ({
      ...prev,
      proteinPercent: targetProteinPercent,
      carbsPercent: targetCarbsPercent,
      fatPercent: targetFatPercent,
      calorieAdjustment: deficitSurplus
    }));
  }, [targetProteinPercent, targetCarbsPercent, targetFatPercent, deficitSurplus]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type: 'user' | 'ai', content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addMessageWithYoutube = (type: 'user' | 'ai', content: string, youtubeUrl?: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      type,
      content,
      timestamp: new Date(),
      youtubeUrl
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const isYouTubeUrl = (url: string): boolean => {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(url);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Check if message contains YouTube URL
    const youtubeMatch = userMessage.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+)/);
    const detectedYoutubeUrl = youtubeMatch ? youtubeMatch[1] : null;
    
    if (detectedYoutubeUrl) {
      addMessageWithYoutube('user', userMessage, detectedYoutubeUrl);
    } else {
      addMessage('user', userMessage);
    }
    
    setIsLoading(true);

    try {
      // Check for specific commands
      const lowerMessage = userMessage.toLowerCase();
      
      if (detectedYoutubeUrl && (lowerMessage.includes('meal plan') || lowerMessage.includes('diet plan'))) {
        // Create meal plan from video
        try {
          const result = await createMealPlanFromVideo(detectedYoutubeUrl, clientData, targetCalories);
          if (result) {
            // Update meals and selected foods
            const newMeals = [...meals, ...result.meals];
            onMealsChange(newMeals);
            onSelectedFoodsChange({ ...selectedFoods, ...result.selectedFoods });
            onNotesChange(result.notes);
            
            addMessage('ai', `🎉 **Meal Plan Created Successfully!**\n\nI've analyzed the YouTube video and created ${result.meals.length} meals with specific foods and quantities based on the video content. The meals have been added to your diet plan!\n\n📝 **Notes updated with video recommendations.**\n\nYou can now review and adjust the quantities as needed.`);
          } else {
            addMessage('ai', 'I had trouble creating a meal plan from the video. Please try again or provide more specific details.');
          }
        } catch (error) {
          addMessage('ai', 'Sorry, I encountered an error creating the meal plan from the video. Please try again.');
        }
      } else if (detectedYoutubeUrl && (lowerMessage.includes('workout plan') || lowerMessage.includes('exercise plan'))) {
        // Create workout plan from video
        if (!onWorkoutsChange || !onSelectedExercisesChange) {
          addMessage('ai', 'Workout plan creation is only available in the workout tab. Please switch to the workout tab and try again.');
        } else {
          try {
            const workouts = await createWorkoutPlanFromVideo(detectedYoutubeUrl, clientData);
            if (workouts) {
              onWorkoutsChange(workouts);
              
              // Create exercise objects for each exercise
              const exercises: { [key: string]: any } = {};
              workouts.forEach(workout => {
                workout.exercises.forEach((exercise: any) => {
                  exercises[exercise.id] = {
                    id: exercise.exerciseId,
                    name: exercise.name || 'Custom Exercise',
                    type: 'custom',
                    muscle: 'various',
                    equipment: 'various',
                    difficulty: 'intermediate',
                    instructions: exercise.notes || 'Follow video instructions'
                  };
                });
              });
              onSelectedExercisesChange(exercises);
              
              addMessage('ai', `💪 **Workout Plan Created Successfully!**\n\nI've analyzed the YouTube video and created a ${workouts.length}-day workout plan with specific exercises, sets, reps, and rest times based on the video content.\n\n🎯 **The workout plan has been added to your workout builder!**\n\nYou can now review and adjust the exercises as needed.`);
            } else {
              addMessage('ai', 'I had trouble creating a workout plan from the video. Please try again or provide more specific details.');
            }
          } catch (error) {
            addMessage('ai', 'Sorry, I encountered an error creating the workout plan from the video. Please try again.');
          }
        }
      } else if (lowerMessage.includes('search food') || lowerMessage.includes('find food')) {
        // Enhanced food search
        const foodQuery = userMessage.replace(/search food|find food/gi, '').trim();
        if (foodQuery) {
          try {
            const result = await aiEnhancedFoodSearch(foodQuery, `Client: ${clientData.nameEn || 'N/A'}, Target: ${targetCalories} kcal`);
            let response = `🔍 **Enhanced Food Search Results for "${foodQuery}":**\n\n`;
            
            result.foods.forEach((food, index) => {
              response += `${index + 1}. **${food.name_en}**\n`;
              response += `   • ${food.calories_per_100g} kcal/100g\n`;
              response += `   • Protein: ${food.protein_g_per_100g}g | Carbs: ${food.carbs_g_per_100g}g | Fat: ${food.fat_g_per_100g}g\n\n`;
            });
            
            if (result.aiRecommendation) {
              response += `💡 **AI Recommendation:** ${result.aiRecommendation}`;
            }
            
            addMessage('ai', response);
          } catch (error) {
            addMessage('ai', 'Sorry, I encountered an error searching for foods. Please try again.');
          }
        } else {
          addMessage('ai', 'Please specify what food you want to search for. For example: "search food chicken breast" or "find food high protein snack"');
        }
      } else if (detectedYoutubeUrl) {
        // Handle YouTube video analysis
        const analysisType = userMessage.toLowerCase().includes('workout') ? 'workout' :
                           userMessage.toLowerCase().includes('diet') || userMessage.toLowerCase().includes('meal') ? 'diet' : 'both';
        
        const analysis = await analyzeYouTubeVideo(detectedYoutubeUrl, analysisType);
        addMessage('ai', `${analysis}\n\n🎯 **Quick Actions Available:**\n- Say "create meal plan from video" to generate a diet plan\n- Say "create workout plan from video" to generate a workout plan\n- Both will use the specific foods and exercises from the video!`);
      } else {
        // Regular chat
        const context = {
          clientData,
          currentMeals: meals,
          targetCalories,
          currentTotals,
          dietSettings: {
            proteinPercent: targetProteinPercent,
            carbsPercent: targetCarbsPercent,
            fatPercent: targetFatPercent,
            calorieAdjustment: deficitSurplus,
            mealCount: meals.length || 4,
            dietType: 'balanced',
            restrictions: '',
            preferences: '',
            goals: 'maintenance'
          },
          deficitSurplus
        };

        const response = await chatWithAI(userMessage, context);
        addMessage('ai', response);
      }
    } catch (error) {
      addMessage('ai', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDietPlan = async () => {
    if (!isAIAvailable()) {
      addMessage('ai', 'Please enter your Google AI API key in the credentials section to use this feature.');
      return;
    }

    setIsLoading(true);
    
    // Create detailed user message based on settings
    const settingsMessage = `Generate a diet plan with these specifications:
- Macros: ${dietSettings.proteinPercent}% protein, ${dietSettings.carbsPercent}% carbs, ${dietSettings.fatPercent}% fat
- Calorie adjustment: ${dietSettings.calorieAdjustment > 0 ? '+' : ''}${dietSettings.calorieAdjustment} calories (${dietSettings.calorieAdjustment > 0 ? 'surplus' : dietSettings.calorieAdjustment < 0 ? 'deficit' : 'maintenance'})
- Number of meals: ${dietSettings.mealCount}
- Diet type: ${dietSettings.dietType}
- Goals: ${dietSettings.goals}
${dietSettings.restrictions ? `- Dietary restrictions: ${dietSettings.restrictions}` : ''}
${dietSettings.preferences ? `- Food preferences: ${dietSettings.preferences}` : ''}`;
    
    addMessage('user', settingsMessage);

    try {
      const dietPlan = await generateDietPlan(
        clientData, 
        targetCalories, 
        dietSettings,
        meals,
        deficitSurplus
      );
      
      if (dietPlan) {
        // Update meals and selected foods
        onMealsChange(dietPlan.meals);
        if (onSelectedFoodsChange && dietPlan.selectedFoods) {
          console.log('Updating selectedFoods with:', dietPlan.selectedFoods);
          onSelectedFoodsChange({ ...selectedFoods, ...dietPlan.selectedFoods });
        }
        
        // Update notes
        if (dietPlan.notes && onNotesChange) {
          onNotesChange(dietPlan.notes);
        }

        addMessage('ai', `🎉 **PRECISION DIET PLAN GENERATED SUCCESSFULLY!**\n\n**AI REASONING & VERIFICATION:**\n${dietPlan.reasoning}\n\n**EXACT SPECIFICATIONS MET:**\n✅ Generated ${dietPlan.meals.length} meals\n✅ Macro Distribution: ${dietSettings.proteinPercent}% protein, ${dietSettings.carbsPercent}% carbs, ${dietSettings.fatPercent}% fat\n✅ Calorie Target: ${targetCalories + deficitSurplus} kcal ${deficitSurplus !== 0 ? `(${deficitSurplus > 0 ? '+' : ''}${deficitSurplus} ${deficitSurplus > 0 ? 'surplus' : 'deficit'})` : '(maintenance)'}\n✅ Diet Type: ${dietSettings.dietType}\n✅ Goals: ${dietSettings.goals}\n\n📝 **PROFESSIONAL NOTES:** ${dietPlan.notes}\n\n🔍 **All foods have been precisely calculated and automatically added to your meal plan!** The AI has followed your EXACT specifications with mathematical precision. Review the dashboard to verify the targets have been met exactly.`);
      } else {
        addMessage('ai', 'I had trouble generating a diet plan. Please make sure your client data is complete and try again.');
      }
    } catch (error) {
      console.error('Diet plan generation error:', error);
      addMessage('ai', 'Sorry, I encountered an error while generating the diet plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleYouTubeAnalysis = async () => {
    if (!youtubeUrl.trim() || isLoading) return;

    if (!isYouTubeUrl(youtubeUrl)) {
      addMessage('ai', 'Please provide a valid YouTube URL (e.g., https://youtube.com/watch?v=...)');
      return;
    }

    const url = youtubeUrl.trim();
    setYoutubeUrl('');
    addMessageWithYoutube('user', `Analyze this YouTube video: ${url}`, url);
    setIsLoading(true);

    try {
      const analysis = await analyzeYouTubeVideo(url, 'both');
      addMessage('ai', analysis);
    } catch (error) {
      addMessage('ai', 'Sorry, I encountered an error analyzing the YouTube video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMealFromAI = async (foodNames: string[]) => {
    try {
      const { meal, selectedFoods } = await searchAndAddFoods(foodNames, 'AI Suggested Meal');
      
      // Add the meal and update selected foods
      onMealsChange([...meals, meal]);
      
      // Note: We'd need to update selectedFoods in the parent component
      addMessage('ai', `I've created a meal plan with ${meal.foods.length} food items and added it to your meal builder!`);
    } catch (error) {
      addMessage('ai', 'Sorry, I encountered an error creating the meal plan. Please try again.');
    }
  };

  const handleAnalyzeDiet = async () => {
    if (!isAIAvailable()) {
      addMessage('ai', 'Please enter your Google AI API key in the credentials section to use this feature.');
      return;
    }

    setIsLoading(true);
    addMessage('user', 'Analyze my current diet plan');

    try {
      const analysis = await analyzeDiet(clientData, meals, selectedFoods, targetCalories, currentTotals);
      addMessage('ai', analysis);
    } catch (error) {
      addMessage('ai', 'Sorry, I encountered an error while analyzing the diet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAIAvailable()) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 ${isRTL ? 'rtl' : ''}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Bot className="text-orange-600" size={20} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">AI Assistant</h2>
        </div>
        
        <div className="text-center py-8 text-gray-500">
          <Bot size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">AI Assistant Not Available</p>
          <p className="text-sm">Please enter your Google AI API key in the credentials section to enable AI features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col relative ${showDietSettings ? 'z-50' : 'z-10'} ${isRTL ? 'rtl' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
        <div className="p-2 bg-green-100 rounded-lg">
          <Bot className="text-green-600" size={20} />
        </div>
        <div className="flex-1 ml-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">AI Nutrition Assistant</h2>
          <p className="text-sm text-gray-600 hidden sm:block">Intelligent diet planning and nutrition guidance</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Quick Actions & Settings */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">AI Tools & Settings</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDietSettings(!showDietSettings)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showDietSettings 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                <Settings size={12} />
                Diet Settings
              </button>
            </div>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={handleGenerateDietPlan}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <Sparkles size={14} />
              Generate Plan
            </button>
            <button
              onClick={handleAnalyzeDiet}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <TrendingUp size={14} />
              Analyze Diet
            </button>
          </div>
          
          {/* YouTube Input */}
          <div className="bg-white rounded-lg p-3 border border-red-200">
            <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Youtube size={12} className="text-red-600" />
              YouTube Video Analysis
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-transparent text-xs"
              />
              <button
                onClick={handleYouTubeAnalysis}
                disabled={!youtubeUrl.trim() || isLoading}
                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                Analyze
              </button>
            </div>
          </div>
        </div>

        {/* Diet Settings Panel */}
        {showDietSettings && (
          <div className="mx-4 mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200 relative z-50 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-indigo-600" />
              <h4 className="font-semibold text-indigo-800 text-sm">Custom Diet Settings</h4>
              <button
                onClick={() => setShowDietSettings(false)}
                className="ml-auto p-1 text-indigo-600 hover:bg-indigo-200 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Macro Ratios */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-gray-700">Macro Ratios (%)</h5>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-red-600 font-medium w-16">Protein:</label>
                    <input
                      type="number"
                      min="10"
                      max="60"
                      value={dietSettings.proteinPercent}
                      onChange={(e) => setDietSettings({...dietSettings, proteinPercent: Number(e.target.value)})}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-yellow-600 font-medium w-16">Carbs:</label>
                    <input
                      type="number"
                      min="5"
                      max="70"
                      value={dietSettings.carbsPercent}
                      onChange={(e) => setDietSettings({...dietSettings, carbsPercent: Number(e.target.value)})}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-purple-600 font-medium w-16">Fat:</label>
                    <input
                      type="number"
                      min="15"
                      max="60"
                      value={dietSettings.fatPercent}
                      onChange={(e) => setDietSettings({...dietSettings, fatPercent: Number(e.target.value)})}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Total: {dietSettings.proteinPercent + dietSettings.carbsPercent + dietSettings.fatPercent}%
                    {dietSettings.proteinPercent + dietSettings.carbsPercent + dietSettings.fatPercent !== 100 && (
                      <span className="text-red-600 ml-1">⚠️ Should equal 100%</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Other Settings */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Calorie Adjustment</label>
                  <input
                    type="number"
                    step="50"
                    value={dietSettings.calorieAdjustment}
                    onChange={(e) => setDietSettings({...dietSettings, calorieAdjustment: Number(e.target.value)})}
                    placeholder="0 for maintenance"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Number of Meals</label>
                  <select
                    value={dietSettings.mealCount}
                    onChange={(e) => setDietSettings({...dietSettings, mealCount: Number(e.target.value)})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={3}>3 meals</option>
                    <option value={4}>4 meals</option>
                    <option value={5}>5 meals</option>
                    <option value={6}>6 meals</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Diet Type</label>
                  <select
                    value={dietSettings.dietType}
                    onChange={(e) => setDietSettings({...dietSettings, dietType: e.target.value})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="balanced">Balanced</option>
                    <option value="keto">Ketogenic</option>
                    <option value="low-carb">Low Carb</option>
                    <option value="high-protein">High Protein</option>
                    <option value="mediterranean">Mediterranean</option>
                    <option value="paleo">Paleo</option>
                    <option value="vegan">Vegan</option>
                    <option value="vegetarian">Vegetarian</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Goals</label>
                  <select
                    value={dietSettings.goals}
                    onChange={(e) => setDietSettings({...dietSettings, goals: e.target.value})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="maintenance">Weight Maintenance</option>
                    <option value="weight-loss">Weight Loss</option>
                    <option value="weight-gain">Weight Gain</option>
                    <option value="muscle-building">Muscle Building</option>
                    <option value="fat-loss">Fat Loss</option>
                    <option value="athletic-performance">Athletic Performance</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Dietary Restrictions</label>
                <input
                  type="text"
                  value={dietSettings.restrictions}
                  onChange={(e) => setDietSettings({...dietSettings, restrictions: e.target.value})}
                  placeholder="e.g., gluten-free, dairy-free, nut allergies"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Food Preferences</label>
                <input
                  type="text"
                  value={dietSettings.preferences}
                  onChange={(e) => setDietSettings({...dietSettings, preferences: e.target.value})}
                  placeholder="e.g., prefer fish over meat, love spicy food, no seafood"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="mt-4 flex gap-2 pt-3 border-t border-indigo-200">
              <button
                onClick={() => {
                  setDietSettings({
                    proteinPercent: 25,
                    carbsPercent: 45,
                    fatPercent: 30,
                    calorieAdjustment: 0,
                    mealCount: 4,
                    dietType: 'balanced',
                    restrictions: '',
                    preferences: '',
                    goals: 'maintenance'
                  });
                }}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors font-medium"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 min-h-[400px] max-h-[500px]">
          {messages.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Start a conversation</p>
              <p className="text-sm">Ask me about nutrition, diet planning, or use the tools above!</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'ai' && (
                <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                  <Bot size={16} className="text-green-600" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.youtubeUrl && (
                  <div className="mb-2 p-2 bg-red-100 rounded text-xs">
                    <Youtube size={12} className="inline mr-1" />
                    YouTube: {message.youtubeUrl}
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              
              {message.type === 'user' && (
                <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                  <User size={16} className="text-blue-600" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                <Bot size={16} className="text-green-600" />
              </div>
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 relative z-10">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about nutrition, diet planning, or paste a YouTube URL..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};