// Complex AI orchestration file — keep types tight where possible.
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FoodItem } from '../utils/calculations';
import { ClientData } from '../utils/calculations';
import { searchFoods, getDetailedFoodInfo } from './nutritionixApi';
import { searchFatSecretFoods, getDetailedFatSecretFoodInfo } from './fatsecretApi';

// Dynamic credentials that can be set at runtime
// Default Google AI API key (can be overridden via env var or setGoogleAICredentials)
let API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || 'AIzaSyDPz5mE6meznFyKuwrKYM7OjyuwTnItaAs';
let genAI: GoogleGenerativeAI | null = null;

// Initialize with the API key
genAI = new GoogleGenerativeAI(API_KEY);

// AI debug helper
const aiDebug = (...args: any[]) => {
  try {
    console.debug('[AI-DEBUG]', ...args);
  } catch (e) {
    // ignore logging failures
  }
};

// Function to set credentials dynamically
export const setGoogleAICredentials = (apiKey: string) => {
  API_KEY = apiKey;
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
  } else {
    genAI = null;
  }
  // Log action for runtime verification (do not log the actual key)
  try {
  const masked = apiKey ? `****${apiKey.slice(-6)}` : 'none';
  console.log(`[googleAiService] setGoogleAICredentials: apiKey ${apiKey ? 'provided' : 'cleared'} (${masked}), genAI ${genAI ? 'initialized' : 'null'}`);
  } catch (e) {
    // ignore logging errors
  }
};


// Check if AI is available
export const isAIAvailable = (): boolean => {
  if (isQuotaBlocked()) {
    console.warn('[googleAiService] AI temporarily unavailable due to quota backoff');
    return false;
  }
  return genAI !== null && API_KEY !== '';
};
// Special error to mark quota problems
class QuotaError extends Error {
  public isQuota = true;
  constructor(message: string, public original?: any) {
    super(message);
    this.name = 'QuotaError';
  }
}

// Global quota backoff state (timestamp ms until which we should avoid calling the API)
let quotaBackoffUntil = 0;

function setBackoffFromError(err: any) {
  try {
    const s = (err && (err.toString ? err.toString() : JSON.stringify(err))) || '';
    const m = s.match(/retryDelay"\s*:\s*"?(\d+)s"?/i) || s.match(/(\d+)s/);
    const seconds = m ? parseInt(m[1], 10) : 60;
    quotaBackoffUntil = Date.now() + Math.max(10, seconds) * 1000;
    console.warn(`[googleAiService] Setting quota backoff for ${seconds}s (until ${new Date(quotaBackoffUntil).toISOString()})`);
  } catch (e) {
    quotaBackoffUntil = Date.now() + 60 * 1000;
  }
}

function isQuotaBlocked(): boolean {
  return Date.now() < (quotaBackoffUntil || 0);
}

// Extract YouTube video ID from URL
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

// Get YouTube video transcript and metadata
const getYouTubeVideoInfo = async (videoId: string): Promise<string> => {
  try {
    // Since we can't directly access YouTube API in the browser, we'll use the video URL
    // and let the AI model analyze what it can infer from the URL and title
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // For now, we'll return the URL and let the AI model work with it
    // In a production environment, you might want to use a backend service
    // to fetch actual video transcripts or metadata
    return `YouTube Video: ${videoUrl}`;
  } catch (error) {
    console.error('Error getting YouTube video info:', error);
    return `YouTube Video ID: ${videoId}`;
  }
};

// Analyze YouTube video content
export const analyzeYouTubeVideo = async (
  youtubeUrl: string,
  analysisType: 'workout' | 'diet' | 'both' = 'both'
): Promise<string> => {
  if (!isAIAvailable()) {
    throw new Error('Google AI not available. Please check your API key.');
  }

  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please provide a valid YouTube video link.');
  }

  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const videoInfo = await getYouTubeVideoInfo(videoId);

    let prompt = `
I want you to analyze this YouTube video: ${youtubeUrl}

Video Information: ${videoInfo}

Please analyze this fitness/nutrition video and provide detailed, actionable recommendations.
Based on the video content, create specific plans that can be implemented in a diet and workout planning application.

`;

    if (analysisType === 'workout' || analysisType === 'both') {
      prompt += `
For WORKOUT content, please provide:
1. A detailed workout plan with specific exercise names (use common exercise names that would be found in fitness databases)
2. Exact sets, reps, and rest periods for each exercise
3. Form cues and safety tips
4. Equipment needed
5. Difficulty level and modifications
6. Weekly schedule recommendations

`;
    }

    if (analysisType === 'diet' || analysisType === 'both') {
      prompt += `
For DIET content, please provide:
1. Specific meal suggestions with exact food names and quantities (use common food names that would be found in nutrition databases like "chicken breast", "brown rice", "broccoli", etc.)
2. Exact quantities in grams or standard serving sizes
3. Nutritional breakdown and macro targets
4. Meal timing recommendations
5. Preparation instructions
6. Healthy alternatives and substitutions

IMPORTANT: When suggesting foods, use specific, searchable food names that would be found in nutrition databases.
For example: "chicken breast, skinless" instead of just "chicken", "brown rice, cooked" instead of just "rice".

`;
    }

    prompt += `
Please provide practical, actionable advice that can be directly implemented into a diet and workout planning application.
Be extremely specific with:
- Food names (use database-searchable terms)
- Exact quantities in grams or standard measurements
- Exercise names (use standard fitness terminology)
- Sets, reps, and timing

Format your response in a clear, structured way that's easy to follow and implement directly into the application.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error analyzing YouTube video:', error);
    throw new Error('Failed to analyze YouTube video. Please try again.');
  }
};


// Enhanced food search with AI assistance
export const aiEnhancedFoodSearch = async (
  query: string,
  context?: string
): Promise<{ foods: FoodItem[]; aiRecommendation?: string }> => {
  if (!isAIAvailable()) {
    // Fallback to regular search
    const [nutritionixResults, fatSecretResults] = await Promise.all([
      searchFoods(query),
      searchFatSecretFoods(query)
    ]);
    
    const foods: FoodItem[] = [];
    
    // Process Nutritionix results
    for (const food of nutritionixResults.slice(0, 5)) {
      try {
        const detailedFood = await getDetailedFoodInfo(food, Date.now() + Math.random());
        detailedFood.servingInfo = {
          serving_weight_grams: food.serving_weight_grams,
          serving_qty: food.serving_qty,
          serving_unit: food.serving_unit
        };
        foods.push(detailedFood);
      } catch (error) {
        console.error('Error getting detailed food info:', error);
      }
    }
    
    // Process FatSecret results
    for (const food of fatSecretResults.slice(0, 3)) {
      try {
        const detailedFood = await getDetailedFatSecretFoodInfo(food, Date.now() + Math.random());
        foods.push(detailedFood);
      } catch (error) {
        console.error('Error getting detailed FatSecret food info:', error);
      }
    }
    
    return { foods };
  }

  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // First, let AI suggest better search terms
    const searchPrompt = `
User is searching for: "${query}"
${context ? `Context: ${context}` : ''}

Please suggest 3-5 specific, database-searchable food names that would best match this search.
Use common food names that would be found in nutrition databases.

Examples:
- Instead of "protein" suggest "chicken breast, skinless", "salmon fillet", "greek yogurt, plain"
- Instead of "carbs" suggest "brown rice, cooked", "sweet potato, baked", "oats, rolled"
- Instead of "healthy snack" suggest "almonds, raw", "apple, medium", "greek yogurt, plain"

Respond with just the food names, one per line, no additional text.
`;

    const searchResult = await model.generateContent(searchPrompt);
    const aiSuggestions = searchResult.response.text().split('\n').filter(line => line.trim());
    
    // Search for each AI suggestion
    const allFoods: FoodItem[] = [];
    const searchPromises: Promise<void>[] = [];
    
    for (const suggestion of aiSuggestions.slice(0, 3)) {
      const cleanSuggestion = suggestion.replace(/^[-*]\s*/, '').trim();
      
      searchPromises.push(
        (async () => {
          try {
            const [nutritionixResults, fatSecretResults] = await Promise.all([
              searchFoods(cleanSuggestion),
              searchFatSecretFoods(cleanSuggestion)
            ]);
            
            // Process top result from each API
            if (nutritionixResults.length > 0) {
              const detailedFood = await getDetailedFoodInfo(nutritionixResults[0], Date.now() + Math.random());
              detailedFood.servingInfo = {
                serving_weight_grams: nutritionixResults[0].serving_weight_grams,
                serving_qty: nutritionixResults[0].serving_qty,
                serving_unit: nutritionixResults[0].serving_unit
              };
              allFoods.push(detailedFood);
            }
            
            if (fatSecretResults.length > 0) {
              const detailedFood = await getDetailedFatSecretFoodInfo(fatSecretResults[0], Date.now() + Math.random());
              allFoods.push(detailedFood);
            }
          } catch (error) {
            console.error(`Error searching for ${cleanSuggestion}:`, error);
          }
        })()
      );
    }
    
    await Promise.all(searchPromises);
    
    // Generate AI recommendation
    const recommendationPrompt = `
User searched for: "${query}"
${context ? `Context: ${context}` : ''}

Found foods: ${allFoods.map(f => `${f.name_en} (${f.calories_per_100g} cal/100g)`).join(', ')}

Provide a brief recommendation (1-2 sentences) about which food(s) would be best for the user's needs.
`;
    
    const recResult = await model.generateContent(recommendationPrompt);
    const aiRecommendation = recResult.response.text();
    
    return { foods: allFoods, aiRecommendation };
    
  } catch (error) {
    console.error('Error in AI-enhanced food search:', error);
    // Fallback to regular search
    return aiEnhancedFoodSearch(query); // Recursive call without AI
  }
};

// Create meal plan from YouTube video analysis
export const createMealPlanFromVideo = async (
  youtubeUrl: string,
  clientData: Partial<ClientData>,
  targetCalories: number
): Promise<{ meals: any[]; selectedFoods: { [key: string]: FoodItem }; notes: string } | null> => {
  if (!isAIAvailable()) {
    throw new Error('Google AI not available for video analysis.');
  }

  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL.');
  }

  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const videoInfo = await getYouTubeVideoInfo(videoId);

    const prompt = `
Analyze this YouTube fitness/nutrition video: ${youtubeUrl}
Video Info: ${videoInfo}

Client Profile:
- Age: ${clientData.age || 'N/A'} years
- Gender: ${clientData.gender || 'N/A'}
- Weight: ${clientData.weight || 'N/A'} kg
- Height: ${clientData.height || 'N/A'} cm
- Target Calories: ${targetCalories} kcal/day

Based on the video content, create a detailed meal plan with specific foods and quantities.

CRITICAL REQUIREMENTS:
1. Use EXACT food names that can be found in nutrition databases
2. Provide EXACT quantities in grams
3. Create 4-5 meals for the day
4. Ensure total calories match the target (${targetCalories} kcal)
5. Use common, searchable food names like "chicken breast, skinless", "brown rice, cooked", "broccoli, steamed"

Respond ONLY with valid JSON in this exact format:
{
  "meals": [
    {
      "name": "Breakfast",
      "foods": [
        {
          "name": "exact food name for database search",
          "quantity": 150,
          "unit": "g"
        }
      ]
    }
  ],
  "notes": "Video-based recommendations and tips",
  "videoSource": "${youtubeUrl}"
}
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extract JSON from response
    let jsonString = '';
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    } else {
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = response.substring(firstBrace, lastBrace + 1);
      }
    }
    
    if (!jsonString) {
      throw new Error('Could not extract meal plan from AI response');
    }
    
    const aiMealPlan = JSON.parse(jsonString);
    
    // Now search for each food and create the actual meal plan
    const meals: any[] = [];
    const selectedFoods: { [key: string]: FoodItem } = {};
    
    for (const aiMeal of aiMealPlan.meals) {
      const meal = {
        id: `video-meal-${Date.now()}-${Math.random()}`,
        name: aiMeal.name,
        foods: [] as any[]
      };
      
      for (const aiFood of aiMeal.foods) {
        try {
          // Search for the food in both databases
          const [nutritionixResults, fatSecretResults] = await Promise.all([
            searchFoods(aiFood.name),
            searchFatSecretFoods(aiFood.name)
          ]);
          
          let selectedFood: FoodItem | null = null;
          
          // Prefer Nutritionix results
          if (nutritionixResults.length > 0) {
            selectedFood = await getDetailedFoodInfo(nutritionixResults[0], Date.now() + Math.random());
            selectedFood.servingInfo = {
              serving_weight_grams: nutritionixResults[0].serving_weight_grams,
              serving_qty: nutritionixResults[0].serving_qty,
              serving_unit: nutritionixResults[0].serving_unit
            };
          } else if (fatSecretResults.length > 0) {
            selectedFood = await getDetailedFatSecretFoodInfo(fatSecretResults[0], Date.now() + Math.random());
          }
          
          if (selectedFood) {
            const foodEntryId = `video-food-${Date.now()}-${Math.random()}`;
            
            meal.foods.push({
              id: foodEntryId,
              foodId: selectedFood.id,
              quantity: aiFood.quantity || 100,
              unit: aiFood.unit || 'g',
              videoSource: youtubeUrl
            });
            
            selectedFoods[foodEntryId] = selectedFood;
          }
        } catch (error) {
          console.error(`Error searching for food: ${aiFood.name}`, error);
        }
      }
      
      if (meal.foods.length > 0) {
        meals.push(meal);
      }
    }
    
    return {
      meals,
      selectedFoods,
      notes: `${aiMealPlan.notes}\n\nGenerated from YouTube video: ${youtubeUrl}`
    };
    
  } catch (error) {
    console.error('Error creating meal plan from video:', error);
    throw new Error('Failed to create meal plan from video. Please try again.');
  }
};

// Create workout plan from YouTube video analysis
export const createWorkoutPlanFromVideo = async (
  youtubeUrl: string,
  clientData: Partial<ClientData>
): Promise<any[] | null> => {
  if (!isAIAvailable()) {
    throw new Error('Google AI not available for video analysis.');
  }

  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL.');
  }

  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const videoInfo = await getYouTubeVideoInfo(videoId);

    const prompt = `
Analyze this YouTube fitness video: ${youtubeUrl}
Video Info: ${videoInfo}

Client Profile:
- Age: ${clientData.age || 'N/A'} years
- Gender: ${clientData.gender || 'N/A'}
- Weight: ${clientData.weight || 'N/A'} kg
- Height: ${clientData.height || 'N/A'} cm

Based on the video content, create a detailed workout plan.

CRITICAL REQUIREMENTS:
1. Use EXACT exercise names (e.g., "Push-ups", "Squats", "Deadlift", "Bench Press")
2. Provide specific sets, reps, and rest times
3. Create a weekly schedule (3-7 days)
4. Include rest days where appropriate

Respond ONLY with valid JSON in this exact format:
{
  "workouts": [
    {
      "displayName": "Day 1 - Upper Body",
      "isRestDay": false,
      "exercises": [
        {
          "name": "Push-ups",
          "sets": 3,
          "reps": "12-15",
          "weight": 0,
          "restTime": 2,
          "notes": "Keep core tight"
        }
      ],
      "notes": "Focus on form over speed"
    },
    {
      "displayName": "Day 2 - Rest",
      "isRestDay": true,
      "exercises": [],
      "notes": "Active recovery - light walking"
    }
  ],
  "videoSource": "${youtubeUrl}"
}
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extract JSON from response
    let jsonString = '';
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    } else {
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = response.substring(firstBrace, lastBrace + 1);
      }
    }
    
    if (!jsonString) {
      throw new Error('Could not extract workout plan from AI response');
    }
    
    const aiWorkoutPlan = JSON.parse(jsonString);
    
    // Convert AI workout plan to app format
    const workouts = aiWorkoutPlan.workouts.map((aiWorkout: any, index: number) => ({
      id: `video-workout-${Date.now()}-${index}`,
      day: `day-${index + 1}`,
      displayName: aiWorkout.displayName,
      isRestDay: aiWorkout.isRestDay || false,
      exercises: aiWorkout.exercises.map((exercise: any, exerciseIndex: number) => ({
        id: `video-exercise-${Date.now()}-${index}-${exerciseIndex}`,
        exerciseId: `custom-${Date.now()}-${exerciseIndex}`,
        sets: exercise.sets || 3,
        reps: exercise.reps || '12',
        weight: exercise.weight || 0,
        restTime: exercise.restTime || 2,
        notes: exercise.notes || '',
        videoUrl: youtubeUrl
      })),
      notes: aiWorkout.notes || `Generated from video: ${youtubeUrl}`
    }));
    
    return workouts;
    
  } catch (error) {
    console.error('Error creating workout plan from video:', error);
    throw new Error('Failed to create workout plan from video. Please try again.');
  }
};

// Search and add foods to meal plan using AI
export const searchAndAddFoods = async (
  foodNames: string[],
  mealName: string = 'AI Generated Meal'
): Promise<{ meal: any; selectedFoods: { [key: string]: FoodItem } }> => {
  const meal = {
    id: `ai-meal-${Date.now()}`,
    name: mealName,
    foods: [] as any[]
  };
  
  const selectedFoods: { [key: string]: FoodItem } = {};
  
  for (const foodName of foodNames) {
    try {
      // Search both APIs
      const [nutritionixResults, fatSecretResults] = await Promise.all([
        searchFoods(foodName),
        searchFatSecretFoods(foodName)
      ]);
      
      let selectedFood: FoodItem | null = null;
      
      // Prefer Nutritionix results if available
      if (nutritionixResults.length > 0) {
        selectedFood = await getDetailedFoodInfo(nutritionixResults[0], Date.now() + Math.random());
        selectedFood.servingInfo = {
          serving_weight_grams: nutritionixResults[0].serving_weight_grams,
          serving_qty: nutritionixResults[0].serving_qty,
          serving_unit: nutritionixResults[0].serving_unit
        };
      } else if (fatSecretResults.length > 0) {
        selectedFood = await getDetailedFatSecretFoodInfo(fatSecretResults[0], Date.now() + Math.random());
      }
      
      if (selectedFood) {
        const foodEntryId = `ai-food-${Date.now()}-${Math.random()}`;
        
        meal.foods.push({
          id: foodEntryId,
          foodId: selectedFood.id,
          quantity: 100, // Default quantity
          unit: 'g',
          aiSuggestion: {
            name: foodName,
            reasoning: 'Added by AI assistant'
          }
        });
        
        selectedFoods[foodEntryId] = selectedFood;
      }
    } catch (error) {
      console.error(`Error searching for food: ${foodName}`, error);
    }
  }
  
  return { meal, selectedFoods };
};

// (removed unused AI response interfaces)

// Interface for diet settings
interface DietSettings {
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
  calorieAdjustment: number;
  mealCount: number;
  dietType: string;
  restrictions: string;
  preferences: string;
  strictPreferences?: boolean;
  goals: string;
}
// Select the most accurate food from multiple API results
export const selectBestFood = async (
  query: string,
  nutritionixFoods: any[],
  fatSecretFoods: any[]
): Promise<{ source: 'nutritionix' | 'fatsecret'; index: number; reasoning: string } | null> => {
  if (!isAIAvailable()) {
    console.warn('Google AI not available for food selection');
    return null;
  }
  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
You are a nutrition expert helping to select the most accurate food item from search results.

User searched for: "${query}"

Nutritionix Results:
${nutritionixFoods.map((food, index) => `
${index}: ${food.food_name}
- Serving: ${food.serving_qty} ${food.serving_unit} (${food.serving_weight_grams}g)
- Calories: ${food.nf_calories} per serving
- Brand: ${food.brand_name || 'Generic'}
`).join('\n')}

FatSecret Results:
${fatSecretFoods.map((food, index) => `
${index}: ${food.food_name}
- Brand: ${food.brand_name || 'Generic'}
- Description: ${food.food_description || 'N/A'}
`).join('\n')}

Please analyze these results and select the most accurate match for the user's search query. Consider:
1. Exact name match
2. Brand reliability
3. Completeness of nutritional data
4. Generic vs branded items (prefer branded when specific)

Respond in JSON format:
{
  "source": "nutritionix" or "fatsecret",
  "index": number,
  "reasoning": "brief explanation of why this is the best choice",
  "confidence": number between 0-100
}
`;

    aiDebug('selectBestFood prompt (truncated):', prompt.slice(0, 400));
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    aiDebug('selectBestFood response (truncated):', text.slice(0, 400));

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const aiResponse = JSON.parse(jsonMatch[0]);
        return {
          source: aiResponse.source,
          index: aiResponse.index,
          reasoning: aiResponse.reasoning
        };
      } catch (err) {
        aiDebug('selectBestFood JSON parse failed:', err);
        return null;
      }
    }

    return null;
  } catch (error: any) {
    const s = (error && (error.toString ? error.toString() : JSON.stringify(error))) || '';
    if (s.includes('quota') || s.includes('429') || (error && error.status === 429)) {
      console.error('Google API quota error detected in selectBestFood:', error);
      setBackoffFromError(error);
      throw new QuotaError('Google API quota exceeded', error);
    }
    console.error('Error in AI food selection:', error);
    return null;
  }
};

// Generate a diet plan based on client data and preferences
export const generateDietPlan = async (
  clientData: Partial<ClientData>,
  targetCalories: number,
  dietSettings: DietSettings | string = '',
  currentMeals: any[] = [],
  deficitSurplus: number = 0
): Promise<{ meals: any[]; selectedFoods: { [key: string]: FoodItem }; notes: string; reasoning: string } | null> => {
  if (!isAIAvailable()) {
    console.warn('Google AI not available for diet plan generation');
    return null;
  }

  // Normalize settings
  const settings: DietSettings = typeof dietSettings === 'string' ? {
    proteinPercent: 25,
    carbsPercent: 45,
    fatPercent: 30,
    calorieAdjustment: 0,
    mealCount: 4,
    dietType: 'balanced',
    restrictions: dietSettings,
    preferences: '',
    goals: 'maintenance'
  } : dietSettings;

  // Compute targets
  const adjustedTargetCalories = targetCalories + (deficitSurplus || 0);
  const totalMacroPercent = settings.proteinPercent + settings.carbsPercent + settings.fatPercent;
  if (Math.abs(totalMacroPercent - 100) > 0.1) throw new Error(`Macro percentages must add up to 100%. Current total: ${totalMacroPercent}%`);

  const proteinCalories = Math.round(adjustedTargetCalories * (settings.proteinPercent / 100));
  const carbsCalories = Math.round(adjustedTargetCalories * (settings.carbsPercent / 100));
  const fatCalories = Math.round(adjustedTargetCalories * (settings.fatPercent / 100));
  const proteinGrams = Math.round((proteinCalories / 4) * 10) / 10;
  const carbsGrams = Math.round((carbsCalories / 4) * 10) / 10;
  const fatGrams = Math.round((fatCalories / 9) * 10) / 10;
  const totalCalculatedCalories = proteinCalories + carbsCalories + fatCalories;
  const calorieDiscrepancy = adjustedTargetCalories - totalCalculatedCalories;
  const adjustedFatCalories = fatCalories + calorieDiscrepancy;
  const adjustedFatGrams = Math.round((adjustedFatCalories / 9) * 10) / 10;
  const finalProteinCalories = Math.round(proteinGrams * 4);
  const finalCarbsCalories = Math.round(carbsGrams * 4);
  const finalFatCalories = Math.round(adjustedFatGrams * 9);
  const finalTotalCalories = finalProteinCalories + finalCarbsCalories + finalFatCalories;

  console.log('EXACT MACRO CALCULATIONS:', { targetCalories, deficitSurplus, adjustedTargetCalories, proteinGrams, carbsGrams, adjustedFatGrams, finalTotalCalories });

  const maxAttempts = 10;
  const previousAttempts: Array<any> = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🤖 AI Learning Attempt ${attempt}/${maxAttempts}`);

    try {
      let result: any = null;

      if (attempt === 1) {
        result = await generateInitialDietPlan(
          clientData,
          targetCalories,
          settings,
          adjustedTargetCalories,
          proteinGrams,
          carbsGrams,
          adjustedFatGrams,
          finalProteinCalories,
          finalCarbsCalories,
          finalFatCalories,
          finalTotalCalories,
          deficitSurplus
        );
      } else {
        result = await intelligentlyAdjustDietPlan(
          clientData,
          targetCalories,
          settings,
          adjustedTargetCalories,
          proteinGrams,
          carbsGrams,
          adjustedFatGrams,
          finalProteinCalories,
          finalCarbsCalories,
          finalFatCalories,
          finalTotalCalories,
          deficitSurplus,
          currentMeals,
          {},
          previousAttempts
        );
      }

      if (!result) {
        console.warn(`AI returned no result on attempt ${attempt}`);
        await new Promise(res => setTimeout(res, 500));
        continue;
      }

      // Validate and accept if meets targets
      const validation = validateDietPlanSpecifications(
        result.meals || [],
        result.selectedFoods || {},
        adjustedTargetCalories,
        proteinGrams,
        carbsGrams,
        adjustedFatGrams,
        settings.proteinPercent,
        settings.carbsPercent,
        settings.fatPercent
      );

      previousAttempts.push({ attempt, result, validation });

      if (validation.isValid) {
        console.log(`✅ AI generated valid plan on attempt ${attempt}`);
        return {
          meals: result.meals,
          selectedFoods: result.selectedFoods,
          notes: result.notes || '',
          reasoning: result.reasoning || ''
        };
      }

      // If last attempt, throw error with details
      if (attempt === maxAttempts) break;

      // Otherwise wait and continue
      await new Promise(res => setTimeout(res, 700));
    } catch (err: any) {
      if (err && err.isQuota) throw err;
      console.error(`Attempt ${attempt} failed:`, err);
      // backoff on quota-like errors
      const s = (err && (err.toString ? err.toString() : JSON.stringify(err))) || '';
      if (s.includes('quota') || s.includes('429')) setBackoffFromError(err);
    }
  }

  throw new Error(`AI failed to generate a diet plan meeting exact specifications after ${maxAttempts} attempts.`);
};

// Helper function for initial diet plan generation
async function generateInitialDietPlan(
  clientData: Partial<ClientData>,
  targetCalories: number,
  settings: DietSettings,
  adjustedTargetCalories: number,
  proteinGrams: number,
  carbsGrams: number,
  adjustedFatGrams: number,
  finalProteinCalories: number,
  finalCarbsCalories: number,
  finalFatCalories: number,
  finalTotalCalories: number,
  deficitSurplus: number
): Promise<{ meals: any[]; selectedFoods: { [key: string]: FoodItem }; notes: string; reasoning: string; adjustments: string[] } | null> {
  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
You are an EXPERT PROFESSIONAL NUTRITIONIST and REGISTERED DIETITIAN with 20+ years of experience. You are EXTREMELY PRECISE and FOLLOW INSTRUCTIONS EXACTLY. You NEVER deviate from the specified requirements.

🚨 CRITICAL INSTRUCTION: You MUST follow the exact specifications provided. This is NON-NEGOTIABLE. ZERO TOLERANCE FOR DEVIATION.

Client Information:
- Name: ${clientData.nameEn || 'N/A'}
- Height: ${clientData.height || 'N/A'} cm
- Weight: ${clientData.weight || 'N/A'} kg
- Age: ${clientData.age || 'N/A'} years
- Gender: ${clientData.gender || 'N/A'}
- Activity Level: ${clientData.activityMultiplier || 'N/A'}
- Base TDEE: ${targetCalories} kcal/day
- Calorie Adjustment: ${deficitSurplus > 0 ? '+' : ''}${deficitSurplus} calories
- FINAL TARGET CALORIES: ${adjustedTargetCalories} kcal/day

🔢 EXACT MATHEMATICAL REQUIREMENTS (FOLLOW WITH ZERO TOLERANCE):

Step 1: Calculate Final Target Calories
Base TDEE: ${targetCalories} kcal
Calorie Adjustment: ${deficitSurplus} kcal
Final Target: ${targetCalories} + (${deficitSurplus}) = ${adjustedTargetCalories} kcal

Step 2: Calculate Exact Macro Distribution
Protein: ${settings.proteinPercent}% × ${adjustedTargetCalories} = ${finalProteinCalories} kcal ÷ 4 = ${proteinGrams}g
Carbs: ${settings.carbsPercent}% × ${adjustedTargetCalories} = ${finalCarbsCalories} kcal ÷ 4 = ${carbsGrams}g
Fat: ${settings.fatPercent}% × ${adjustedTargetCalories} = ${finalFatCalories} kcal ÷ 9 = ${adjustedFatGrams}g

VERIFICATION: ${finalProteinCalories} + ${finalCarbsCalories} + ${finalFatCalories} = ${finalTotalCalories} kcal (Target: ${adjustedTargetCalories} kcal)

🚨 ABSOLUTE MANDATORY REQUIREMENTS - ZERO TOLERANCE FOR DEVIATION:

1. CALORIE PRECISION: The total daily calories MUST EXACTLY equal ${adjustedTargetCalories} kcal (±50 calories maximum deviation). This is CRITICAL.

2. MACRO PRECISION: You MUST hit these EXACT macro targets (±5g maximum deviation):
   - Protein: EXACTLY ${proteinGrams}g (${finalProteinCalories} kcal = ${settings.proteinPercent}%)
   - Carbohydrates: EXACTLY ${carbsGrams}g (${finalCarbsCalories} kcal = ${settings.carbsPercent}%)  
   - Fat: EXACTLY ${adjustedFatGrams}g (${finalFatCalories} kcal = ${settings.fatPercent}%)

3. MEAL DISTRIBUTION: Create exactly ${settings.mealCount} meals with logical calorie distribution

4. DIET TYPE COMPLIANCE: Strictly follow ${settings.dietType} diet principles:
   ${getDietTypeGuidelines(settings.dietType)}

5. GOAL OPTIMIZATION: Optimize for ${settings.goals}:
   ${getGoalGuidelines(settings.goals)}

6. CALORIE ADJUSTMENT UNDERSTANDING:
   ${deficitSurplus === 0 ? 
     '- MAINTENANCE: No calorie adjustment, maintain current weight' :
     deficitSurplus > 0 ? 
     `- SURPLUS: +${deficitSurplus} calories above TDEE for WEIGHT GAIN` :
     `- DEFICIT: ${deficitSurplus} calories below TDEE for WEIGHT LOSS`
   }
   This adjustment is ALREADY INCLUDED in your target of ${adjustedTargetCalories} kcal.

7. FOOD DATABASE COMPATIBILITY: Use EXACT, SEARCHABLE food names:
   - Examples: "chicken breast, skinless", "brown rice, cooked", "broccoli, steamed", "greek yogurt, plain"
   - Provide PRECISE quantities in grams that achieve the exact macro targets
   - Ensure foods are commonly available and searchable

8. RESTRICTIONS & PREFERENCES: 
   ${settings.restrictions ? `- MUST AVOID: ${settings.restrictions}` : ''}
   ${settings.preferences ? `- PREFER: ${settings.preferences}` : ''}

9. NUTRITIONAL QUALITY AND COMPLIANCE: Ensure the plan includes:
   - Adequate micronutrients (vitamins and minerals)
   - Sufficient fiber (25-35g daily)
   - Proper hydration recommendations
   - Meal timing considerations
   - EXACT adherence to calorie and macro targets

10. MATHEMATICAL PRECISION:
   - Calculate each food's contribution to calories and macros precisely
   - Adjust quantities to hit exact targets
   - The sum of all meals MUST equal EXACTLY ${adjustedTargetCalories} kcal
   - The sum of all protein MUST equal EXACTLY ${proteinGrams}g
   - The sum of all carbs MUST equal EXACTLY ${carbsGrams}g  
   - The sum of all fat MUST equal EXACTLY ${adjustedFatGrams}g

🚨 MANDATORY VERIFICATION CHECKLIST - VERIFY BEFORE RESPONDING:
✓ Total calories = ${adjustedTargetCalories} kcal (EXACTLY ±50 kcal)
✓ Protein = ${proteinGrams}g (${finalProteinCalories} kcal = ${settings.proteinPercent}%)
✓ Carbs = ${carbsGrams}g (${finalCarbsCalories} kcal = ${settings.carbsPercent}%)
✓ Fat = ${adjustedFatGrams}g (${finalFatCalories} kcal = ${settings.fatPercent}%)
✓ All macro percentages add up to 100%
✓ Calorie adjustment properly applied: ${targetCalories} ${deficitSurplus >= 0 ? '+' : ''}${deficitSurplus} = ${adjustedTargetCalories}

🚨 EXAMPLE VERIFICATION (using your exact numbers):
If TDEE = 3421 kcal and Deficit = -500 kcal, then Target = 2921 kcal
If Macros are 35% protein, 40% carbs, 25% fat:
- Protein: 35% × 2921 = 1022.35 kcal ÷ 4 = 255.6g protein
- Carbs: 40% × 2921 = 1168.4 kcal ÷ 4 = 292.1g carbs
- Fat: 25% × 2921 = 730.25 kcal ÷ 9 = 81.1g fat
Total: 1022.35 + 1168.4 + 730.25 = 2921 kcal ✓

🚨 CRITICAL: You MUST achieve EXACTLY ${adjustedTargetCalories} kcal total, not ${adjustedTargetCalories - 50} or ${adjustedTargetCalories + 50}. The target is ${adjustedTargetCalories} kcal and you MUST hit it precisely.

Respond ONLY with a valid JSON object, no additional text or markdown formatting:

{
  "meals": [
    {
      "name": "Meal name (e.g., Breakfast, Lunch, etc.)",
      "foods": [
        {
          "name": "exact searchable food name",
          "quantity": number,
          "unit": "g" or "cup" or "piece" etc,
          "reasoning": "why this food fits the plan and contributes to macro goals"
        }
      ]
    }
  ],
  "notes": "Comprehensive advice including meal timing, hydration, supplements if needed, and practical tips. MUST include mathematical verification that all targets were met exactly: ${adjustedTargetCalories} kcal, ${proteinGrams}g protein, ${carbsGrams}g carbs, ${adjustedFatGrams}g fat.",
  "reasoning": "Detailed explanation of how this plan meets the EXACT macro targets (${settings.proteinPercent}% protein, ${settings.carbsPercent}% carbs, ${settings.fatPercent}% fat) and calorie goals (${adjustedTargetCalories} kcal). Include mathematical verification and scientific rationale behind food choices."
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text: string;
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      text = response.text();
    } catch (err: any) {
      const s = (err && (err.toString ? err.toString() : JSON.stringify(err))) || '';
      if (s.includes('quota') || s.includes('429') || (err && err.status === 429)) {
        console.error('Google API quota error detected in intelligentlyAdjustDietPlan:', err);
        setBackoffFromError(err);
        throw new QuotaError('Google API quota exceeded', err);
      }
      throw err;
    }
    
    // Process the response and create the diet plan
  const allowedPrefs = parsePreferences(settings.preferences);
  const processedResult = await processDietPlanResponse(text, clientData, allowedPrefs, !!settings.strictPreferences);
    
    if (processedResult) {
      return {
        ...processedResult,
        adjustments: ["Initial diet plan generated"]
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in initial diet plan generation:', error);
    return null;
  }
}

// Intelligent adjustment function that learns from previous attempts
async function intelligentlyAdjustDietPlan(
  clientData: Partial<ClientData>,
  targetCalories: number,
  settings: DietSettings,
  adjustedTargetCalories: number,
  proteinGrams: number,
  carbsGrams: number,
  adjustedFatGrams: number,
  finalProteinCalories: number,
  finalCarbsCalories: number,
  finalFatCalories: number,
  finalTotalCalories: number,
  deficitSurplus: number,
  currentMeals: any[],
  currentSelectedFoods: { [key: string]: FoodItem },
  previousAttempts: Array<any>
): Promise<{ meals: any[]; selectedFoods: { [key: string]: FoodItem }; notes: string; reasoning: string; adjustments: string[] } | null> {
  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Analyze previous attempts to understand what needs adjustment
    let lastAttempt: any = null;
    let validation: any = null;
    if (previousAttempts && previousAttempts.length > 0) {
      lastAttempt = previousAttempts[previousAttempts.length - 1];
      validation = lastAttempt.validation;
    } else {
      // Defensive fallback: compute validation from current meals if no previous attempts are provided
      try {
        validation = validateDietPlanSpecifications(
          currentMeals,
          currentSelectedFoods,
          adjustedTargetCalories,
          proteinGrams,
          carbsGrams,
          adjustedFatGrams,
          settings.proteinPercent,
          settings.carbsPercent,
          settings.fatPercent
        );
        lastAttempt = { attempt: 0, validation, meals: currentMeals };
      } catch (err) {
        console.warn('intelligentlyAdjustDietPlan: unable to compute fallback validation', err);
        return null;
      }
    }
    
    // Determine what needs to be adjusted
    const calorieDiff = adjustedTargetCalories - validation.actualTotals.calories;
    const proteinDiff = proteinGrams - validation.actualTotals.protein;
    const carbsDiff = carbsGrams - validation.actualTotals.carbs;
    const fatDiff = adjustedFatGrams - validation.actualTotals.fat;

    const adjustments = [];
    if (Math.abs(calorieDiff) > 50) adjustments.push(`Calories need ${calorieDiff > 0 ? 'increase' : 'decrease'} of ${Math.abs(calorieDiff)} kcal`);
    if (Math.abs(proteinDiff) > 5) adjustments.push(`Protein needs ${proteinDiff > 0 ? 'increase' : 'decrease'} of ${Math.abs(proteinDiff)}g`);
    if (Math.abs(carbsDiff) > 5) adjustments.push(`Carbs need ${carbsDiff > 0 ? 'increase' : 'decrease'} of ${Math.abs(carbsDiff)}g`);
    if (Math.abs(fatDiff) > 5) adjustments.push(`Fat needs ${fatDiff > 0 ? 'increase' : 'decrease'} of ${Math.abs(fatDiff)}g`);

    const previousSummary = previousAttempts && previousAttempts.length > 0 ? previousAttempts.slice(-3).map(a => `Attempt ${a.attempt}: calories=${a.validation.actualTotals.calories}, protein=${a.validation.actualTotals.protein}, carbs=${a.validation.actualTotals.carbs}, fat=${a.validation.actualTotals.fat}`).join('\n') : 'No previous attempts available.';

    const pureFoodHints = `Prioritized pure macro foods for fine-tuning: ${PURE_MACRO_CANDIDATES.map(p => p.name).join(', ')}`;

    const prompt = `
You are an EXPERT PROFESSIONAL NUTRITIONIST and REGISTERED DIETITIAN. You need to INTELLIGENTLY ADJUST a previous diet plan based on what you learned.

🧠 AI LEARNING CONTEXT:
This is attempt ${previousAttempts.length + 1} of generating a diet plan. You have learned from previous attempts and need to make intelligent adjustments.

RECENT ATTEMPTS SUMMARY:
${previousSummary}

PURE FOOD HINTS:
${pureFoodHints}

📊 PREVIOUS ATTEMPT ANALYSIS:
- Target Calories: ${adjustedTargetCalories} kcal
- Actual Calories: ${validation.actualTotals.calories} kcal
- Calorie Difference: ${calorieDiff} kcal (${calorieDiff > 0 ? 'UNDER' : 'OVER'} target)

- Target Protein: ${proteinGrams}g
- Actual Protein: ${validation.actualTotals.protein}g  
- Protein Difference: ${proteinDiff}g (${proteinDiff > 0 ? 'UNDER' : 'OVER'} target)

- Target Carbs: ${carbsGrams}g
- Actual Carbs: ${validation.actualTotals.carbs}g
- Carbs Difference: ${carbsDiff}g (${carbsDiff > 0 ? 'UNDER' : 'OVER'} target)

- Target Fat: ${adjustedFatGrams}g
- Actual Fat: ${validation.actualTotals.fat}g
- Fat Difference: ${fatDiff}g (${fatDiff > 0 ? 'UNDER' : 'OVER'} target)

🎯 INTELLIGENT ADJUSTMENT STRATEGY:
Based on the differences above, you need to:

${adjustments.map(adj => `• ${adj}`).join('\n')}

🧠 AI LEARNING APPROACH:
1. KEEP the same food sources from the previous attempt
2. ADJUST PORTIONS intelligently to hit targets
3. If calories are too high: Reduce portions of higher-calorie foods
4. If calories are too low: Increase portions of lower-calorie foods
5. If protein is too low: Increase portions of protein-rich foods
6. If carbs are too high: Reduce portions of carb-rich foods
7. If fat is too high: Reduce portions of fat-rich foods
8. Use your nutrition expertise to make smart portion adjustments

📋 CURRENT MEAL PLAN TO ADJUST:
${JSON.stringify(currentMeals, null, 2)}

🚨 REQUIREMENTS:
- Target Calories: ${adjustedTargetCalories} kcal (±50 kcal tolerance)
- Target Protein: ${proteinGrams}g (±5g tolerance)
- Target Carbs: ${carbsGrams}g (±5g tolerance)  
- Target Fat: ${adjustedFatGrams}g (±5g tolerance)
- Keep the same food sources but adjust portions intelligently
- Maintain meal structure and variety

Respond ONLY with a valid JSON object containing the adjusted meals:

{
  "meals": [
    {
      "name": "Meal name",
      "foods": [
        {
          "name": "same food name as before",
          "quantity": adjusted_quantity,
          "unit": "g",
          "reasoning": "explanation of why this quantity adjustment was made"
        }
      ]
    }
  ],
  "notes": "Brief notes about the intelligent adjustments made",
  "reasoning": "Explanation of how the AI learned and adjusted the previous plan"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Process the adjusted response
  const allowedPrefs = parsePreferences(settings.preferences);
  const processedResult = await processDietPlanResponse(text, clientData, allowedPrefs, !!settings.strictPreferences);
    
    if (processedResult) {
      return {
        ...processedResult,
        adjustments: adjustments
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in intelligent diet plan adjustment:', error);
    return null;
  }
}

// Helper function to process diet plan responses
async function processDietPlanResponse(
  text: string,
  clientData: Partial<ClientData>,
  allowedPreferences: string[] | null = null,
  strictMode: boolean = false
): Promise<{ meals: any[]; selectedFoods: { [key: string]: FoodItem }; notes: string; reasoning: string } | null> {
  // Extract and sanitize JSON from response
  const aiDietPlan = sanitizeAndParseJSON(text, {
    requiredKeys: ['meals']
  });

  if (!aiDietPlan) {
    console.error('Could not parse AI diet plan JSON from response.');
    return null;
  }
      
  // Now search for each food and create the actual meal plan
      const meals: any[] = [];
      const selectedFoods: { [key: string]: FoodItem } = {};
      let totalFoundFoods = 0;
      let totalRequestedFoods = 0;

  for (const aiMeal of aiDietPlan.meals) {
        const meal = {
          id: `ai-meal-${Date.now()}-${Math.random()}`,
          name: aiMeal.name,
          foods: [] as any[]
        };
        
  for (const aiFood of aiMeal.foods) {
          totalRequestedFoods++;
          
          try {
            console.log(`Searching for food: ${aiFood.name}`);

            // Preference handling: when strictMode is true, only try user-selected preferences.
            // Otherwise try AI-suggested name first, then fall back to preferences.
            let selectedFood: FoodItem | null = null;
            const prefList = allowedPreferences && allowedPreferences.length > 0 ? allowedPreferences.map(p => p.toLowerCase()) : null;
            const attemptNames: string[] = [];
            if (strictMode) {
              // If strict mode and no preferences provided, fail fast
              if (!prefList || prefList.length === 0) {
                console.warn(`Strict preferences enabled but no preference list provided for requested item: ${aiFood.name}`);
                return null;
              }
              attemptNames.push(...prefList);
            } else {
              if (aiFood.name) attemptNames.push(aiFood.name);
              if (prefList) {
                for (const p of prefList) {
                  if (!attemptNames.some(a => a.toLowerCase() === p)) attemptNames.push(p);
                }
              }
            }

            // Try each name in order until a match is found
            for (const attemptName of attemptNames) {
              try {
                const [nutritionixResults, fatSecretResults] = await Promise.all([
                  searchFoods(attemptName),
                  searchFatSecretFoods(attemptName)
                ]);

                if (nutritionixResults.length > 0) {
                  selectedFood = await getDetailedFoodInfo(nutritionixResults[0], Date.now() + Math.random());
                  selectedFood.servingInfo = {
                    serving_weight_grams: nutritionixResults[0].serving_weight_grams,
                    serving_qty: nutritionixResults[0].serving_qty,
                    serving_unit: nutritionixResults[0].serving_unit
                  };
                  break;
                } else if (fatSecretResults.length > 0) {
                  selectedFood = await getDetailedFatSecretFoodInfo(fatSecretResults[0], Date.now() + Math.random());
                  break;
                }
              } catch (err) {
                console.warn(`Error searching for allowed preference ${attemptName}:`, err);
              }
            }

            if (selectedFood) {
              // If the AI suggested a food that matches an existing selectedFoods entry by name, reuse that id
              const existingId = Object.keys(selectedFoods).find(k => selectedFoods[k] && selectedFoods[k].name_en && selectedFoods[k].name_en.toLowerCase() === (selectedFood as any).name_en.toLowerCase());
              const foodEntryId = existingId || `ai-food-${Date.now()}-${Math.random()}`;

              // If reusing an existing entry, keep its id and only modify quantity (preserve user preference)
              const quantity = aiFood.quantity || 100;

              meal.foods.push({
                id: foodEntryId,
                foodId: selectedFood.id,
                quantity,
                unit: aiFood.unit || 'g',
                aiGenerated: true,
                aiReasoning: aiFood.reasoning
              });

              // Only overwrite selectedFoods entry if it doesn't exist — preserve user-preferred entries
              if (!existingId) {
                selectedFoods[foodEntryId] = selectedFood;
              }
              totalFoundFoods++;
            } else {
              // If a strict preference list exists and nothing matches, fail fast by returning null
              if (prefList && prefList.length > 0) {
                console.warn(`Strict preferences enabled; none of the allowed foods matched for requested item: ${aiFood.name}`);
                return null;
              }

              console.warn(`Could not find food: ${aiFood.name} — added placeholder to allow iterative adjustments.`);
              const placeholderId = `ai-food-missing-${Date.now()}-${Math.random()}`;
              meal.foods.push({
                id: placeholderId,
                foodId: null,
                quantity: aiFood.quantity || 100,
                unit: aiFood.unit || 'g',
                aiGenerated: true,
                aiReasoning: aiFood.reasoning || 'No match found; placeholder added'
              });
            }
          } catch (error) {
            console.error(`Error searching for food: ${aiFood.name}`, error);
          }
        }
        
        if (meal.foods.length > 0) {
          meals.push(meal);
        }
      }
      
  return {
        meals,
        selectedFoods,
        notes: aiDietPlan.notes || '',
        reasoning: aiDietPlan.reasoning || ''
      };
}

// Robust JSON sanitizer and parser for AI responses
function sanitizeAndParseJSON(text: string, options?: { requiredKeys?: string[] }): any | null {
  if (!text || typeof text !== 'string') return null;

  // Remove markdown code fences first
  let cleaned = text.replace(/```[\s\S]*?```/g, (match) => {
    // If codeblock contains JSON-like content, keep the inner braces
    const inner = match.replace(/```(?:json)?\s*/, '').replace(/```\s*$/, '');
    return inner;
  });

  // Normalize smart quotes
  cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // Try to extract the largest JSON-looking substring
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  let jsonString = cleaned.substring(firstBrace, lastBrace + 1);

  // Attempt multiple parsing strategies
  const attempts = [
    (s: string) => JSON.parse(s),
    // remove trailing commas in objects/arrays
    (s: string) => JSON.parse(s.replace(/,\s*([}\]])/g, '$1')),
    // replace single quotes with double quotes (naive)
    (s: string) => JSON.parse(s.replace(/'/g, '"')),
    // combination: single -> double + remove trailing commas
    (s: string) => JSON.parse(s.replace(/'/g, '"').replace(/,\s*([}\]])/g, '$1'))
  ];

  for (const attempt of attempts) {
    try {
      const parsed = attempt(jsonString);
      if (parsed && typeof parsed === 'object') {
        // quick shape validation if required keys provided
        if (options?.requiredKeys) {
          const hasAll = options.requiredKeys.every(k => Object.prototype.hasOwnProperty.call(parsed, k));
          if (!hasAll) continue;
        }
        return parsed;
      }
    } catch (err) {
      // continue trying
    }
  }

  return null;
}

// Enhanced chat with better understanding of diet commands
// Helper function to get diet type guidelines
function getDietTypeGuidelines(dietType: string): string {
  const guidelines: { [key: string]: string } = {
    'balanced': 'Focus on whole foods, balanced macronutrients, and variety',
    'keto': 'Very low carb (<5%), high fat (70-80%), moderate protein. Focus on healthy fats and low-carb vegetables',
    'low-carb': 'Limit carbs to 20-30%, increase protein and healthy fats. Avoid grains, sugars, and starchy vegetables',
    'high-protein': 'Emphasize lean proteins, support muscle building and satiety. Include protein at every meal',
    'mediterranean': 'Emphasize olive oil, fish, vegetables, whole grains, legumes, and moderate wine',
    'paleo': 'Focus on whole foods: meat, fish, eggs, vegetables, fruits, nuts. Avoid grains, legumes, dairy',
    'vegan': 'Plant-based only: no animal products. Focus on legumes, grains, vegetables, fruits, nuts, seeds',
    'vegetarian': 'No meat or fish. Include dairy and eggs. Focus on plant proteins and variety'
  };
  return guidelines[dietType] || 'Follow general healthy eating principles';
}

// Helper function to get goal-specific guidelines
function getGoalGuidelines(goals: string): string {
  const guidelines: { [key: string]: string } = {
    'maintenance': 'Maintain current weight with balanced nutrition and adequate calories',
    'weight-loss': 'Create moderate calorie deficit while preserving muscle mass. Emphasize protein and fiber',
    'weight-gain': 'Create calorie surplus with nutrient-dense foods. Focus on healthy weight gain',
    'muscle-building': 'Optimize protein intake (1.6-2.2g/kg body weight), ensure adequate calories and carbs for training',
    'fat-loss': 'Preserve muscle while losing fat. High protein, moderate carbs, strategic meal timing',
    'athletic-performance': 'Optimize carbs for energy, adequate protein for recovery, proper hydration and timing'
  };
  return guidelines[goals] || 'Support overall health and wellness';
}

// STRICT VALIDATION FUNCTION: Ensures generated diet plan meets exact specifications
function validateDietPlanSpecifications(
  meals: any[],
  selectedFoods: { [key: string]: FoodItem },
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  proteinPercent: number,
  carbsPercent: number,
  fatPercent: number
): { isValid: boolean; errors: string[]; actualTotals: any } {
  const errors: string[] = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  // Calculate actual totals from the generated meals
  for (const meal of meals) {
    for (const food of meal.foods) {
      const selectedFood = selectedFoods[food.id];
      if (selectedFood && food.quantity) {
        const multiplier = food.quantity / 100;
        totalCalories += Math.round(selectedFood.calories_per_100g * multiplier);
        totalProtein += Math.round((selectedFood.protein_g_per_100g * multiplier) * 10) / 10;
        totalCarbs += Math.round((selectedFood.carbs_g_per_100g * multiplier) * 10) / 10;
        totalFat += Math.round((selectedFood.fat_g_per_100g * multiplier) * 10) / 10;
      }
    }
  }

  // STRICT VALIDATION CHECKS
  const calorieDeviation = Math.abs(totalCalories - targetCalories);
  const proteinDeviation = Math.abs(totalProtein - targetProtein);
  const carbsDeviation = Math.abs(totalCarbs - targetCarbs);
  const fatDeviation = Math.abs(totalFat - targetFat);

  // Calorie validation (±150 kcal tolerance — original)
  if (calorieDeviation > 150) {
    errors.push(`❌ CALORIE DEVIATION TOO HIGH: Target ${targetCalories} kcal, Actual ${totalCalories} kcal, Deviation ${calorieDeviation} kcal (Max allowed: 150 kcal)`);
  }

  // Macro validation (±15g tolerance — original)
  if (proteinDeviation > 15) {
    errors.push(`❌ PROTEIN DEVIATION TOO HIGH: Target ${targetProtein}g, Actual ${totalProtein}g, Deviation ${proteinDeviation}g (Max allowed: 15g)`);
  }

  if (carbsDeviation > 15) {
    errors.push(`❌ CARBS DEVIATION TOO HIGH: Target ${targetCarbs}g, Actual ${totalCarbs}g, Deviation ${carbsDeviation}g (Max allowed: 15g)`);
  }

  if (fatDeviation > 15) {
    errors.push(`❌ FAT DEVIATION TOO HIGH: Target ${targetFat}g, Actual ${totalFat}g, Deviation ${fatDeviation}g (Max allowed: 15g)`);
  }

  // Percentage validation (±3% tolerance — original)
  const actualProteinPercent = Math.round((totalProtein * 4 / totalCalories) * 100);
  const actualCarbsPercent = Math.round((totalCarbs * 4 / totalCalories) * 100);
  const actualFatPercent = Math.round((totalFat * 9 / totalCalories) * 100);

  if (Math.abs(actualProteinPercent - proteinPercent) > 3) {
    errors.push(`❌ PROTEIN PERCENTAGE OFF: Target ${proteinPercent}%, Actual ${actualProteinPercent}%`);
  }

  if (Math.abs(actualCarbsPercent - carbsPercent) > 3) {
    errors.push(`❌ CARBS PERCENTAGE OFF: Target ${carbsPercent}%, Actual ${actualCarbsPercent}%`);
  }

  if (Math.abs(actualFatPercent - fatPercent) > 3) {
    errors.push(`❌ FAT PERCENTAGE OFF: Target ${fatPercent}%, Actual ${actualFatPercent}%`);
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    console.error('DIET PLAN VALIDATION FAILED:', {
      target: { calories: targetCalories, protein: targetProtein, carbs: targetCarbs, fat: targetFat },
      actual: { calories: totalCalories, protein: totalProtein, carbs: totalCarbs, fat: totalFat },
      deviations: { calories: calorieDeviation, protein: proteinDeviation, carbs: carbsDeviation, fat: fatDeviation },
      percentages: { target: { protein: proteinPercent, carbs: carbsPercent, fat: fatPercent }, actual: { protein: actualProteinPercent, carbs: actualCarbsPercent, fat: actualFatPercent } }
    });
  }

  return {
    isValid,
    errors,
    actualTotals: {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      proteinPercent: actualProteinPercent,
      carbsPercent: actualCarbsPercent,
      fatPercent: actualFatPercent
    }
  };
}

// Programmatic deterministic portion scaler
function programmaticAdjustPortions(
  meals: any[],
  selectedFoods: { [key: string]: FoodItem },
  targets: { calories: number; protein: number; carbs: number; fat: number },
  options: { maxScalePercentPerAttempt?: number } = {}
): any[] | null {
  try {
    const maxScale = options.maxScalePercentPerAttempt || 10; // percent

    // Compute current totals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const meal of meals) {
      for (const food of meal.foods) {
        const sf = selectedFoods[food.id];
        if (!sf || !food.quantity) continue;
        const mult = food.quantity / 100;
        totalCalories += Math.round(sf.calories_per_100g * mult);
        totalProtein += (sf.protein_g_per_100g * mult);
        totalCarbs += (sf.carbs_g_per_100g * mult);
        totalFat += (sf.fat_g_per_100g * mult);
      }
    }

    const calorieDiff = targets.calories - totalCalories;
    if (Math.abs(calorieDiff) < 30) return null; // small enough, don't adjust

    const scaleFactor = 1 + Math.max(-maxScale / 100, Math.min(maxScale / 100, calorieDiff / Math.max(1, totalCalories)));

    // Apply uniform scaling capped by maxScale
    const newMeals = JSON.parse(JSON.stringify(meals));
    for (const meal of newMeals) {
      for (const food of meal.foods) {
        if (!food.quantity) continue;
        const newQty = Math.round(food.quantity * scaleFactor);
        food.quantity = Math.max(1, newQty);
      }
    }

    return newMeals;
  } catch (err) {
    console.error('Error in programmaticAdjustPortions:', err);
    return null;
  }
}

// Redistribute portions across existing meals to fix macro imbalances while keeping
// total calories roughly the same. This is a greedy heuristic that adjusts quantities
// (percentage changes) of existing foods prioritized by macro-per-calorie efficiency.
function redistributePortionsForMacros(
  meals: any[],
  selectedFoods: { [key: string]: FoodItem },
  targets: { calories: number; protein: number; carbs: number; fat: number },
  options: { maxPercentChangePerFood?: number; iterations?: number } = {}
): any[] | null {
  try {
    const maxPercent = options.maxPercentChangePerFood ?? 20; // percent per food per run
    const iterations = options.iterations ?? 5;

    // deep copy meals so we don't mutate original
    let newMeals = JSON.parse(JSON.stringify(meals));

    const computeTotals = (mMeals: any[]) => {
      let cals = 0, prot = 0, carbs = 0, fat = 0;
      for (const meal of mMeals) {
        for (const food of meal.foods) {
          const sf = selectedFoods[food.id];
          if (!sf || !food.quantity) continue;
          const mult = food.quantity / 100;
          cals += Math.round(sf.calories_per_100g * mult);
          prot += (sf.protein_g_per_100g * mult);
          carbs += (sf.carbs_g_per_100g * mult);
          fat += (sf.fat_g_per_100g * mult);
        }
      }
      return { calories: cals, protein: Math.round(prot * 10) / 10, carbs: Math.round(carbs * 10) / 10, fat: Math.round(fat * 10) / 10 };
    };

    let totals = computeTotals(newMeals);

    // If calories are far off, don't run this routine
    if (Math.abs(totals.calories - targets.calories) > 200) return null;

    for (let it = 0; it < iterations; it++) {
      totals = computeTotals(newMeals);
      const protDiff = targets.protein - totals.protein;
      const carbDiff = targets.carbs - totals.carbs;
      const fatDiff = targets.fat - totals.fat;

      // If within stricter tolerances, stop
      if (Math.abs(protDiff) <= 10 && Math.abs(carbDiff) <= 10 && Math.abs(fatDiff) <= 8) break;

      // Build list of candidate foods with macro efficiency metrics
      const candidates: Array<{ mealIdx: number; foodIdx: number; id: string; name?: string; perCalProtein: number; perCalCarbs: number; perCalFat: number; qty: number }> = [];
      newMeals.forEach((meal: any, mi: number) => {
        meal.foods.forEach((food: any, fi: number) => {
          const sf = selectedFoods[food.id];
          if (!sf || !food.quantity) return;
          const calPerGram = (sf.calories_per_100g || 0) / 100;
          if (calPerGram <= 0) return;
          const perCalProtein = (sf.protein_g_per_100g || 0) / 100 / calPerGram;
          const perCalCarbs = (sf.carbs_g_per_100g || 0) / 100 / calPerGram;
          const perCalFat = (sf.fat_g_per_100g || 0) / 100 / calPerGram;
          candidates.push({ mealIdx: mi, foodIdx: fi, id: food.id, name: sf.name_en, perCalProtein, perCalCarbs, perCalFat, qty: food.quantity });
        });
      });

      if (candidates.length === 0) break;

      // Greedy adjustments: if protein too high -> reduce foods with high protein-per-calorie;
      // if protein too low -> increase protein-dense foods. Similar logic for carbs/fat.
      const adjustFor = (macro: 'protein' | 'carbs' | 'fat', diff: number) => {
        if (Math.abs(diff) < 5) return;
        // sort candidates by macro per calorie
  // avoid dynamic indexing for TS: pick explicit metric
  let metric = (item: any) => item.perCalProtein;
  if (macro === 'carbs') metric = (item: any) => item.perCalCarbs;
  else if (macro === 'fat') metric = (item: any) => item.perCalFat;
  candidates.sort((a, b) => metric(b) - metric(a));
        const needIncrease = diff > 0;
        // iterate candidates and apply small percent changes
        for (const c of candidates) {
          // compute percent change to apply (positive to increase, negative to decrease)
          const sign = needIncrease ? 1 : -1;
          const pct = sign * (Math.min(maxPercent, Math.max(2, Math.abs(diff) > 50 ? Math.round(maxPercent) : 6)) / 100);
          const mi = c.mealIdx, fi = c.foodIdx;
          const currentQty = newMeals[mi].foods[fi].quantity || 0;
          const newQty = Math.max(1, Math.round(currentQty * (1 + pct)));
          newMeals[mi].foods[fi].quantity = newQty;

          // Recompute totals and check progress
          totals = computeTotals(newMeals);
          const newDiff = targets[macro] - totals[macro];
          // If we made progress for this macro, continue; else revert and try next candidate
          if ((needIncrease && Math.abs(newDiff) < Math.abs(diff)) || (!needIncrease && Math.abs(newDiff) < Math.abs(diff))) {
            // keep change
            return;
          } else {
            // revert
            newMeals[mi].foods[fi].quantity = currentQty;
          }
        }
      };

      // Try adjusting each macro in turn prioritizing the largest relative deviation
      const absProt = Math.abs(protDiff), absCarb = Math.abs(carbDiff), absFat = Math.abs(fatDiff);
      if (absProt >= absCarb && absProt >= absFat) adjustFor('protein', protDiff);
      else if (absCarb >= absProt && absCarb >= absFat) adjustFor('carbs', carbDiff);
      else adjustFor('fat', fatDiff);
    }

    // Final sanity check: ensure calories stay reasonably close
    const finalTotals = ((): any => {
      let cals = 0;
      for (const meal of newMeals) for (const food of meal.foods) {
        const sf = selectedFoods[food.id];
        if (!sf || !food.quantity) continue;
        cals += Math.round(sf.calories_per_100g * (food.quantity / 100));
      }
      return { calories: cals };
    })();

    if (Math.abs(finalTotals.calories - targets.calories) > 200) return null;
    return newMeals;
  } catch (err) {
    console.warn('redistributePortionsForMacros failed', err);
    return null;
  }
}

// Exact scaling solver: attempt to find absolute gram quantities for the existing set of foods
// that exactly meet protein/carbs/fat targets using NNLS. Returns a new meals array with
// updated quantities if solvable within per-food scaling caps, otherwise null.
function exactScalingSolver(
  meals: any[],
  selectedFoods: { [key: string]: FoodItem },
  targets: { calories: number; protein: number; carbs: number; fat: number },
  options: { maxScalePerFoodPercent?: number } = {}
): any[] | null {
  try {
    // Flatten foods preserving order
    const flat: Array<{ mealIdx: number; foodIdx: number; id: string; originalQty: number; profile: any }> = [];
    meals.forEach((meal, mi) => {
      meal.foods.forEach((food: any, fi: number) => {
        const sf = selectedFoods[food.id];
        if (!sf || !food.quantity) return;
        flat.push({ mealIdx: mi, foodIdx: fi, id: food.id, originalQty: food.quantity, profile: sf });
      });
    });

    if (flat.length === 0) return null;

    const n = flat.length;
    const A: number[][] = [new Array(n).fill(0), new Array(n).fill(0), new Array(n).fill(0)]; // protein, carbs, fat
    const b: number[] = [targets.protein, targets.carbs, targets.fat];

    for (let j = 0; j < n; j++) {
      const p = flat[j].profile;
      A[0][j] = (p.protein_g_per_100g || 0) / 100; // protein per gram
      A[1][j] = (p.carbs_g_per_100g || 0) / 100;
      A[2][j] = (p.fat_g_per_100g || 0) / 100;
    }

    // Solve for grams using NNLS
    const solution = nnlsSolve(A, b, 1000);
    if (!solution || solution.length !== n) return null;

    // Determine scaling caps
    const maxScalePercent = options.maxScalePerFoodPercent ?? 200; // meaning 200% -> factor 2.0
    const maxFactor = Math.max(0.1, maxScalePercent / 100);
    const minFactor = 0.01; // allow downscaling significantly if needed

    // Check factors and build new meals
    const newMeals = JSON.parse(JSON.stringify(meals));
    for (let j = 0; j < n; j++) {
      const grams = Math.max(0, Math.round(solution[j]));
      const orig = flat[j].originalQty || 1;
      const factor = grams / orig;
      if (!isFinite(factor) || grams <= 0) return null;
      // If factor is outside allowed range, abort
      if (factor > maxFactor || factor < minFactor) {
        return null;
      }
      // Apply new quantity
      newMeals[flat[j].mealIdx].foods[flat[j].foodIdx].quantity = grams;
    }

    // Optionally validate calories remain reasonable
    let totalCals = 0;
    for (const m of newMeals) for (const f of m.foods) {
      const sf = selectedFoods[f.id];
      if (!sf || !f.quantity) continue;
      totalCals += Math.round(sf.calories_per_100g * (f.quantity / 100));
    }
    if (Math.abs(totalCals - targets.calories) > Math.max(100, Math.round(targets.calories * 0.1))) return null;

    return newMeals;
  } catch (err) {
    console.warn('exactScalingSolver error', err);
    return null;
  }
}

// Relaxed acceptance logic for intermediate attempts
function checkRelaxedAcceptance(
  actualTotals: { calories: number; protein: number; carbs: number; fat: number },
  targets: { calories: number; protein: number; carbs: number; fat: number },
  attempt: number,
  maxAttempts: number
): boolean {
  // On intermediate attempts, relax tolerances progressively
  const progress = attempt / maxAttempts;
  // Increase starting tolerances by 200% (tripled): start at 300 kcal -> tighten to 150
  const calorieTolerance = 300 - Math.round(progress * 150); // start 300 kcal, tighten to 150
  // Macro tolerance start 45g -> tighten to 15g
  const macroTolerance = 45 - Math.round(progress * 30); // start 45g, tighten to 15g

  const calDev = Math.abs(actualTotals.calories - targets.calories);
  const protDev = Math.abs(actualTotals.protein - targets.protein);
  const carbDev = Math.abs(actualTotals.carbs - targets.carbs);
  const fatDev = Math.abs(actualTotals.fat - targets.fat);

  return calDev <= calorieTolerance && protDev <= macroTolerance && carbDev <= macroTolerance && fatDev <= macroTolerance;
}

// --- Macro correction utilities -------------------------------------------------

// Standardize common food name variants to searchable names
function standardizeFoodName(name: string): string {
  if (!name) return name;
  const s = name.trim().toLowerCase();
  const map: { [key: string]: string } = {
    'chicken': 'chicken breast, skinless',
    'chicken breast': 'chicken breast, skinless',
    'brown rice': 'brown rice, cooked',
    'white rice': 'rice, white, cooked',
    'olive oil': 'olive oil',
    'egg white': 'egg, white, raw',
    'whey': 'whey protein, isolate'
  };
  return map[s] || name;
}

// Parse preferences string into an array of standardized names
function parsePreferences(prefString: string | undefined | null): string[] | null {
  if (!prefString) return null;
  // Accept comma-separated names or newline-separated
  const parts = prefString.split(/[,\n;]/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.map(p => standardizeFoodName(p));
}

// Simple in-memory macro profile cache
const macroProfileCache: Map<string, { calories_per_100g: number; protein_g_per_100g: number; carbs_g_per_100g: number; fat_g_per_100g: number }> = new Map();

function cacheMacroProfile(key: string, profile: { calories_per_100g: number; protein_g_per_100g: number; carbs_g_per_100g: number; fat_g_per_100g: number }) {
  if (!key || !profile) return;
  macroProfileCache.set(key.toLowerCase(), profile);
}

function getCachedProfile(key: string) {
  if (!key) return null;
  return macroProfileCache.get(key.toLowerCase()) || null;
}

// Fetch profile by searching Nutritionix/FatSecret and cache result
async function fetchAndCacheProfile(foodName: string): Promise<{ calories_per_100g: number; protein_g_per_100g: number; carbs_g_per_100g: number; fat_g_per_100g: number } | null> {
  const standardized = standardizeFoodName(foodName);
  const cached = getCachedProfile(standardized);
  if (cached) return cached;

  // If we have a small built-in fallback profile for this core food, use it to avoid external API calls
  const fb = FALLBACK_PROFILES[standardized.toLowerCase()];
  if (fb) {
    cacheMacroProfile(standardized, fb);
    return fb;
  }

  try {
    const [nRes, fRes] = await Promise.all([searchFoods(standardized), searchFatSecretFoods(standardized)]);
    let detailed = null;
    if (nRes && nRes.length > 0) {
      detailed = await getDetailedFoodInfo(nRes[0], Date.now() + Math.random());
    } else if (fRes && fRes.length > 0) {
      detailed = await getDetailedFatSecretFoodInfo(fRes[0], Date.now() + Math.random());
    }

    if (detailed) {
      const profile = {
        calories_per_100g: detailed.calories_per_100g || 0,
        protein_g_per_100g: detailed.protein_g_per_100g || 0,
        carbs_g_per_100g: detailed.carbs_g_per_100g || 0,
        fat_g_per_100g: detailed.fat_g_per_100g || 0
      };
      cacheMacroProfile(standardized, profile);
      return profile;
    }
  } catch (err) {
    console.warn('Failed to fetch profile for', foodName, err);
  }

  return null;
}

// (Replaced) We now use a bounded NNLS solver `nnlsSolve` for non-negative constrained solves.

// Bounded Non-Negative Least Squares (NNLS) for small systems using a simple active-set method.
function nnlsSolve(A: number[][], b: number[], maxIter = 500): number[] | null {
  const m = A.length; // equations (should be 3)
  const n = A[0]?.length || 0; // variables
  if (n === 0) return [];

  // Convert A to m x n and b to m
  // We'll implement a simple projected gradient / active-set hybrid suitable for small n
  // initial guess zeros
  let x = new Array(n).fill(0);

  // Precompute At (n x m) and AtA (n x n) and Atb (n)
  const At = new Array(n).fill(0).map(() => new Array(m).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) At[j][i] = A[i][j];

  const AtA = new Array(n).fill(0).map(() => new Array(n).fill(0));
  const Atb = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < m; k++) s += At[i][k] * A[k][j];
      AtA[i][j] = s;
    }
    let sb = 0;
    for (let k = 0; k < m; k++) sb += At[i][k] * b[k];
    Atb[i] = sb;
  }

  // Active set indices (not used in this lightweight NNLS implementation)

  // Simple coordinate-descent / projected gradient loop
  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;
    for (let i = 0; i < n; i++) {
      // compute gradient g_i = (AtA x - Atb)_i
      let g = -Atb[i];
      for (let j = 0; j < n; j++) g += AtA[i][j] * x[j];
      // take a small step toward negative gradient and project to >=0
      const denom = AtA[i][i] > 1e-9 ? AtA[i][i] : 1e-9;
      const step = -g / denom;
      let newVal = x[i] + step;
      if (newVal < 0) newVal = 0;
      const change = Math.abs(newVal - x[i]);
      if (change > maxChange) maxChange = change;
      x[i] = newVal;
    }
    if (maxChange < 1e-4) break;
  }

  // If result is all zeros, treat as no solution
  const sum = x.reduce((s, v) => s + v, 0);
  if (sum <= 0) return null;
  return x;
}

// Pure macro foods prioritized for fine-tuning (searchable names)
const PURE_MACRO_CANDIDATES = [
  { name: 'whey protein, isolate', macro: 'protein' },
  { name: 'egg, white, raw', macro: 'protein' },
  { name: 'chicken breast, skinless', macro: 'protein' },
  { name: 'brown rice, cooked', macro: 'carbs' },
  { name: 'oats, rolled', macro: 'carbs' },
  { name: 'banana, raw', macro: 'carbs' },
  { name: 'olive oil', macro: 'fat' },
  { name: 'avocado, raw', macro: 'fat' },
  { name: 'butter', macro: 'fat' }
];

// Small fallback profiles for core pure foods to use when external APIs fail or return no results
const FALLBACK_PROFILES: { [key: string]: { calories_per_100g: number; protein_g_per_100g: number; carbs_g_per_100g: number; fat_g_per_100g: number } } = {
  'whey protein, isolate': { calories_per_100g: 400, protein_g_per_100g: 80, carbs_g_per_100g: 8, fat_g_per_100g: 2 },
  'egg, white, raw': { calories_per_100g: 52, protein_g_per_100g: 11, carbs_g_per_100g: 0.7, fat_g_per_100g: 0.2 },
  'chicken breast, skinless': { calories_per_100g: 165, protein_g_per_100g: 31, carbs_g_per_100g: 0, fat_g_per_100g: 3.6 },
  'brown rice, cooked': { calories_per_100g: 123, protein_g_per_100g: 2.7, carbs_g_per_100g: 25.6, fat_g_per_100g: 1 },
  'oats, rolled': { calories_per_100g: 389, protein_g_per_100g: 16.9, carbs_g_per_100g: 66.3, fat_g_per_100g: 6.9 },
  'banana, raw': { calories_per_100g: 89, protein_g_per_100g: 1.1, carbs_g_per_100g: 22.8, fat_g_per_100g: 0.3 },
  'olive oil': { calories_per_100g: 884, protein_g_per_100g: 0, carbs_g_per_100g: 0, fat_g_per_100g: 100 },
  'avocado, raw': { calories_per_100g: 160, protein_g_per_100g: 2, carbs_g_per_100g: 9, fat_g_per_100g: 15 },
  'butter': { calories_per_100g: 717, protein_g_per_100g: 0.9, carbs_g_per_100g: 0.1, fat_g_per_100g: 81 }
};

// Macro correction loop: returns updated meals and selectedFoods with a final correction meal if needed
export async function macroCorrectionLoop(
  meals: any[],
  selectedFoods: { [key: string]: FoodItem },
  targets: { calories: number; protein: number; carbs: number; fat: number },
  options: { maxCandidates?: number; maxCorrectionCalories?: number } = {}
): Promise<{ meals: any[]; selectedFoods: { [key: string]: FoodItem }; correctionMealAdded: boolean; details?: any }> {
  // compute current totals
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const meal of meals) {
    for (const food of meal.foods) {
      const sf = selectedFoods[food.id];
      if (!sf || !food.quantity) continue;
      const mult = food.quantity / 100;
      totalCalories += Math.round(sf.calories_per_100g * mult);
      totalProtein += (sf.protein_g_per_100g * mult);
      totalCarbs += (sf.carbs_g_per_100g * mult);
      totalFat += (sf.fat_g_per_100g * mult);
    }
  }

  const deficit = {
    calories: targets.calories - totalCalories,
    protein: Math.round((targets.protein - totalProtein) * 10) / 10,
    carbs: Math.round((targets.carbs - totalCarbs) * 10) / 10,
    fat: Math.round((targets.fat - totalFat) * 10) / 10
  };

  const needProtein = deficit.protein > 1;
  const needCarbs = deficit.carbs > 1;
  const needFat = deficit.fat > 1;

  if (!needProtein && !needCarbs && !needFat && Math.abs(deficit.calories) <= 50) {
    return { meals, selectedFoods, correctionMealAdded: false, details: { reason: 'within tolerance' } };
  }

  // build candidates based on deficits
  const candidates = PURE_MACRO_CANDIDATES.filter(c => (c.macro === 'protein' && needProtein) || (c.macro === 'carbs' && needCarbs) || (c.macro === 'fat' && needFat));
  const picked = candidates.slice(0, options.maxCandidates || 3);

  // fetch profiles for candidates
  const profiles: Array<{ name: string; profile: any }> = [];
  for (const c of picked) {
    const prof = await fetchAndCacheProfile(c.name);
    if (prof) profiles.push({ name: c.name, profile: prof });
  }

  if (profiles.length === 0) {
    return { meals, selectedFoods, correctionMealAdded: false, details: { reason: 'no profiles' } };
  }

  // Build matrix A * x = b where x = grams of each candidate (per 1g) and b are macro deficits in grams
  // We'll solve for grams (g) added. Use macro contributions per gram = profile / 100
  const A: number[][] = [];
  const B: number[] = [];
  // equations: protein, carbs, fat (we can have up to 3 eqs)
  const eqs = ['protein', 'carbs', 'fat'];
  for (const eq of eqs) {
    const row: number[] = [];
    for (const p of profiles) {
      if (eq === 'protein') row.push(p.profile.protein_g_per_100g / 100);
      if (eq === 'carbs') row.push(p.profile.carbs_g_per_100g / 100);
      if (eq === 'fat') row.push(p.profile.fat_g_per_100g / 100);
    }
    A.push(row);
  }

  B.push(deficit.protein, deficit.carbs, deficit.fat);

  // Try solving using a bounded NNLS solver (non-negative). Fall back to greedy per-macro only if NNLS fails.
  let solution: number[] | null = null;
  try {
    // A is m x n where m=3 eqs, n=#profiles. Our nnlsSolve expects A as m x n.
    solution = nnlsSolve(A, B);
  } catch (err) {
    solution = null;
  }

  const correctionFoods: Array<{ name: string; grams: number; profile: any }> = [];

  if (solution && solution.length === profiles.length) {
    // convert solution (grams) and filter positives
    for (let i = 0; i < solution.length; i++) {
      const grams = Math.max(0, Math.round(solution[i]));
      if (grams > 0) correctionFoods.push({ name: profiles[i].name, grams, profile: profiles[i].profile });
    }
  }

  // If NNLS produced nothing usable, fallback greedy: satisfy each macro separately using best candidate for that macro
  if (correctionFoods.length === 0) {
    if (needProtein) {
      const best = profiles.reduce((a, b) => (b.profile.protein_g_per_100g > a.profile.protein_g_per_100g ? b : a));
      const grams = Math.max(0, Math.round((deficit.protein / (best.profile.protein_g_per_100g / 100))));
      if (grams > 0) correctionFoods.push({ name: best.name, grams, profile: best.profile });
    }
    if (needCarbs) {
      const best = profiles.reduce((a, b) => (b.profile.carbs_g_per_100g > a.profile.carbs_g_per_100g ? b : a));
      const grams = Math.max(0, Math.round((deficit.carbs / (best.profile.carbs_g_per_100g / 100))));
      if (grams > 0) correctionFoods.push({ name: best.name, grams, profile: best.profile });
    }
    if (needFat) {
      const best = profiles.reduce((a, b) => (b.profile.fat_g_per_100g > a.profile.fat_g_per_100g ? b : a));
      const grams = Math.max(0, Math.round((deficit.fat / (best.profile.fat_g_per_100g / 100))));
      if (grams > 0) correctionFoods.push({ name: best.name, grams, profile: best.profile });
    }
  }

  if (correctionFoods.length === 0) {
    return { meals, selectedFoods, correctionMealAdded: false, details: { reason: 'no correction needed or unable to compute' } };
  }

  // Cap correction calories
  const maxCorrectionCalories = options.maxCorrectionCalories || 800;
  let correctionCalories = 0;
  for (const cf of correctionFoods) correctionCalories += Math.round((cf.profile.calories_per_100g * cf.grams) / 100);
  if (correctionCalories > maxCorrectionCalories) {
    const scale = maxCorrectionCalories / correctionCalories;
    for (const cf of correctionFoods) cf.grams = Math.max(1, Math.round(cf.grams * scale));
  }

  // Create correction meal and append
  const correctionMealId = `correction-meal-${Date.now()}`;
  const correctionMeal = { id: correctionMealId, name: 'Macro correction', foods: [] as any[] };
  for (const cf of correctionFoods) {
    // create new FoodItem entry in selectedFoods cache
    const pseudoId = `correction-food-${Date.now()}-${Math.random()}`;
    const foodEntry = {
      id: pseudoId,
      name_en: cf.name,
      calories_per_100g: cf.profile.calories_per_100g,
      protein_g_per_100g: cf.profile.protein_g_per_100g,
      carbs_g_per_100g: cf.profile.carbs_g_per_100g,
      fat_g_per_100g: cf.profile.fat_g_per_100g
    } as any;
    selectedFoods[pseudoId] = foodEntry;

    correctionMeal.foods.push({ id: pseudoId, foodId: pseudoId, quantity: cf.grams, unit: 'g', aiGenerated: true, aiReasoning: 'Macro correction' });
  }

  meals.push(correctionMeal);

  return { meals, selectedFoods, correctionMealAdded: true, details: { correctionFoods } };
}


// New demonstration function for enhanced AI capabilities
export const demonstrateEnhancedAICapabilities = async (
  baseTDEE: number,
  deficitSurplus: number,
  proteinPercent: number,
  carbsPercent: number,
  fatPercent: number
): Promise<string> => {
  if (!isAIAvailable()) {
    return 'Google AI is not available. Please check your API key.';
  }

  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const adjustedTargetCalories = baseTDEE + deficitSurplus;
    
    // Calculate exact macros using our utility functions
    const proteinCalories = Math.round(adjustedTargetCalories * (proteinPercent / 100));
    const carbsCalories = Math.round(adjustedTargetCalories * (carbsPercent / 100));
    const fatCalories = Math.round(adjustedTargetCalories * (fatPercent / 100));
    
    const proteinGrams = Math.round((proteinCalories / 4) * 10) / 10;
    const carbsGrams = Math.round((carbsCalories / 4) * 10) / 10;
    const fatGrams = Math.round((fatCalories / 9) * 10) / 10;

    const prompt = `
You are demonstrating the ENHANCED AI CAPABILITIES for precise nutrition calculations.

Please explain how the AI now handles EXACT mathematical precision for diet planning:

**Example Calculation:**
- Base TDEE: ${baseTDEE} kcal
- Calorie Adjustment: ${deficitSurplus > 0 ? '+' : ''}${deficitSurplus} kcal
- Final Target: ${adjustedTargetCalories} kcal
- Goal: ${deficitSurplus === 0 ? 'MAINTENANCE' : deficitSurplus > 0 ? 'WEIGHT GAIN' : 'WEIGHT LOSS'}

**Exact Macro Calculations:**
- Protein: ${proteinPercent}% × ${adjustedTargetCalories} = ${proteinCalories} kcal ÷ 4 = ${proteinGrams}g
- Carbs: ${carbsPercent}% × ${adjustedTargetCalories} = ${carbsCalories} kcal ÷ 4 = ${carbsGrams}g
- Fat: ${fatPercent}% × ${adjustedTargetCalories} = ${fatCalories} kcal ÷ 9 = ${fatGrams}g

**Mathematical Verification:**
${proteinCalories} + ${carbsCalories} + ${fatCalories} = ${proteinCalories + carbsCalories + fatCalories} kcal ✓

Explain how this enhanced AI service now:
1. Follows EXACT specifications with zero tolerance for deviation
2. Applies calorie adjustments correctly (deficit for weight loss, surplus for weight gain)
3. Calculates macros with mathematical precision
4. Provides step-by-step calculations
5. Ensures 100% adherence to user requirements

Keep the response concise and focused on the mathematical precision improvements.
  `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error demonstrating enhanced AI capabilities:', error);
    return 'Sorry, I encountered an error while demonstrating the enhanced AI capabilities.';
  }
};
export const chatWithAI = async (
  message: string,
  context: {
    clientData?: Partial<ClientData>;
    currentMeals?: any[];
    targetCalories?: number;
    currentTotals?: any;
    dietSettings?: any;
    deficitSurplus?: number;
  }
): Promise<string> => {
  if (!isAIAvailable()) {
    return 'Google AI is not available. Please enter your API key in the credentials section.';
  }

  try {
    const model = genAI!.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    const adjustedTargetCalories = (context.targetCalories || 0) + (context.deficitSurplus || 0);

    const contextInfo = `
CRITICAL DIET CALCULATION CONTEXT:
${context.targetCalories ? `
- Base TDEE (Mifflin-St Jeor + Harris-Benedict average): ${context.targetCalories} kcal
- Calorie Adjustment: ${context.deficitSurplus || 0 > 0 ? '+' : ''}${context.deficitSurplus || 0} kcal
- FINAL TARGET CALORIES: ${adjustedTargetCalories} kcal
- Goal Type: ${(context.deficitSurplus || 0) === 0 ? 'MAINTENANCE (no weight change)' : 
             (context.deficitSurplus || 0) > 0 ? `WEIGHT GAIN (+${context.deficitSurplus || 0} surplus)` : 
             `WEIGHT LOSS (${context.deficitSurplus || 0} deficit)`}

EXACT MACRO CALCULATIONS:
- Protein Target: ${context.dietSettings?.proteinPercent || 25}% = ${Math.round(adjustedTargetCalories * (context.dietSettings?.proteinPercent || 25) / 100)} kcal = ${Math.round((adjustedTargetCalories * (context.dietSettings?.proteinPercent || 25) / 100) / 4)}g
- Carbs Target: ${context.dietSettings?.carbsPercent || 45}% = ${Math.round(adjustedTargetCalories * (context.dietSettings?.carbsPercent || 45) / 100)} kcal = ${Math.round((adjustedTargetCalories * (context.dietSettings?.carbsPercent || 45) / 100) / 4)}g
- Fat Target: ${context.dietSettings?.fatPercent || 30}% = ${Math.round(adjustedTargetCalories * (context.dietSettings?.fatPercent || 30) / 100)} kcal = ${Math.round((adjustedTargetCalories * (context.dietSettings?.fatPercent || 30) / 100) / 9)}g
` : ''}
Current Context:
- Client: ${context.clientData?.nameEn || 'N/A'} (${context.clientData?.age || 'N/A'} years, ${context.clientData?.gender || 'N/A'})
- Base TDEE: ${context.targetCalories || 'N/A'} kcal
- Adjusted Target Calories: ${adjustedTargetCalories} kcal (${context.deficitSurplus ? (context.deficitSurplus > 0 ? `+${context.deficitSurplus} surplus` : `${context.deficitSurplus} deficit`) : 'maintenance'})
- Current Calories: ${context.currentTotals?.calories || 0} kcal
- Current Protein: ${context.currentTotals?.protein || 0}g
- Current Carbs: ${context.currentTotals?.carbs || 0}g
- Current Fat: ${context.currentTotals?.fat || 0}g
- Number of meals planned: ${context.currentMeals?.length || 0}
${context.dietSettings ? `
- Current Diet Settings:
  * Protein: ${context.dietSettings.proteinPercent || 25}%
  * Carbs: ${context.dietSettings.carbsPercent || 45}%
  * Fat: ${context.dietSettings.fatPercent || 30}%
  * Meal Count: ${context.dietSettings.mealCount || 4}
  * Diet Type: ${context.dietSettings.dietType || 'balanced'}
  * Goals: ${context.dietSettings.goals || 'maintenance'}
  * Restrictions: ${context.dietSettings.restrictions || 'None'}
  * Preferences: ${context.dietSettings.preferences || 'None'}` : ''}
`;

    const prompt = `
You are an EXPERT PROFESSIONAL NUTRITIONIST, REGISTERED DIETITIAN, and CERTIFIED FITNESS EXPERT with 20+ years of experience. You have extensive knowledge in:
- Clinical nutrition and metabolism
- Sports nutrition and performance
- Weight management and body composition
- Meal planning and food science
- Dietary restrictions and medical nutrition therapy
- Supplement science and evidence-based recommendations

CRITICAL INSTRUCTIONS:
1. You ALWAYS follow EXACT specifications when given specific numbers (calories, macros, deficits, etc.)
2. You UNDERSTAND and RESPOND to specific diet commands and requirements
3. When the user mentions specific calorie deficits/surplus or macro percentages, you MUST acknowledge and use those EXACT numbers
4. You provide mathematically precise, science-based advice that is practical and actionable
5. You stay current with the latest nutrition research and guidelines
6. You UNDERSTAND that calorie adjustments create deficits (weight loss) or surplus (weight gain) from the base TDEE
7. You NEVER approximate or round when given specific targets - you use EXACT values
8. You ALWAYS verify mathematical calculations and show your work when dealing with numbers

COMMAND RECOGNITION: Pay special attention to:
- Specific calorie numbers (e.g., "500 calorie deficit", "300 surplus")
- Macro percentages (e.g., "40% protein, 30% carbs, 30% fat")
- Meal counts (e.g., "5 meals per day")
- Diet types (e.g., "keto", "high protein", "low carb")
- Specific goals (e.g., "muscle building", "fat loss", "cutting")
- Calorie adjustments (e.g., "500 calorie deficit", "300 surplus", "maintenance")
- TDEE understanding (base metabolic rate calculations)
- Mathematical precision requirements
- Macro percentage adherence

MATHEMATICAL PRECISION REQUIREMENTS:
- When calculating calories from macros: Protein × 4 + Carbs × 4 + Fat × 9 = Total Calories
- When calculating macros from calories: (Percentage × Total Calories) ÷ Calories per gram = Grams
- Always show calculations: e.g., "40% protein of 2600 kcal = 1040 kcal ÷ 4 = 260g protein"
- Verify totals add up to 100% for macro percentages
- Verify calorie calculations are mathematically correct

${contextInfo}

User Question: ${message}

RESPONSE REQUIREMENTS - Please provide expert-level, evidence-based advice that is:
1. Scientifically accurate and up-to-date
2. Personalized to the client's specific situation
3. Practical and actionable
4. Clear and easy to understand
5. Comprehensive yet concise
6. MATHEMATICALLY PRECISE when dealing with numbers
7. ACKNOWLEDGES and USES any specific requirements mentioned in the user's message
8. SHOWS CALCULATIONS when dealing with numbers

MATHEMATICAL UNDERSTANDING: You fully understand that TDEE calculations, calorie adjustments, and macro percentages must be calculated with exact precision as shown in the context above.

If the question involves specific dietary recommendations, calculations, or meal planning:
- Provide detailed guidance with mathematical rationale
- Use EXACT numbers when specified by the user
- Show calculations when relevant
- Acknowledge any specific targets or requirements mentioned
- Offer to generate a new diet plan if the user requests changes to current settings
- Verify all mathematical calculations are correct

EXAMPLE RESPONSE FORMAT FOR CALCULATIONS:
"Based on your request for a 400 calorie deficit from your 3000 kcal TDEE:
- Target Calories: 3000 - 400 = 2600 kcal
- For 40% protein: 40% × 2600 = 1040 kcal ÷ 4 = 260g protein
- For 35% carbs: 35% × 2600 = 910 kcal ÷ 4 = 227.5g carbs  
- For 25% fat: 25% × 2600 = 650 kcal ÷ 9 = 72.2g fat
- Verification: 260g × 4 + 227.5g × 4 + 72.2g × 9 = 1040 + 910 + 650 = 2600 kcal ✓"
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error in AI chat:', error);
    return 'Sorry, I encountered an error while processing your request. Please try again.';
  }
};

// Analyze current diet and provide suggestions
export const analyzeDiet = async (
  clientData: Partial<ClientData>,
  meals: any[],
  selectedFoods: { [key: string]: FoodItem },
  targetCalories: number,
  currentTotals: any
): Promise<string> => {
  if (!isAIAvailable()) {
    return 'Google AI is not available for diet analysis.';
  }

  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const mealSummary = meals.map(meal => ({
      name: meal.name,
      foods: meal.foods.map((food: any) => {
        const selectedFood = selectedFoods[food.id];
        return selectedFood ? {
          name: selectedFood.name_en,
          quantity: food.quantity,
          unit: food.unit
        } : null;
      }).filter(Boolean)
    }));

    const prompt = `
You are a professional nutritionist analyzing a diet plan.

Client Profile:
- Age: ${clientData.age || 'N/A'} years
- Gender: ${clientData.gender || 'N/A'}
- Weight: ${clientData.weight || 'N/A'} kg
- Height: ${clientData.height || 'N/A'} cm
- Activity Level: ${clientData.activityMultiplier || 'N/A'}

Current Diet Plan:
${JSON.stringify(mealSummary, null, 2)}

Nutritional Status:
- Target Calories: ${targetCalories} kcal
- Current Calories: ${currentTotals.calories} kcal
- Current Protein: ${currentTotals.protein}g
- Current Carbs: ${currentTotals.carbs}g
- Current Fat: ${currentTotals.fat}g

Please analyze this diet plan and provide:
1. Overall assessment of nutritional balance
2. Specific recommendations for improvement
3. Suggestions for better food choices
4. Tips for meal timing and portion control

Keep the analysis practical and actionable.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error in diet analysis:', error);
    return 'Sorry, I encountered an error while analyzing the diet. Please try again.';
  }
};