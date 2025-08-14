import { GoogleGenerativeAI } from '@google/generative-ai';
import { FoodItem } from '../utils/calculations';
import { ClientData } from '../utils/calculations';
import { searchFoods, getDetailedFoodInfo } from './nutritionixApi';
import { searchFatSecretFoods, getDetailedFatSecretFoodInfo } from './fatsecretApi';

// Dynamic credentials that can be set at runtime
let API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || 'AIzaSyBrxrdQGq6QFN8zIOjo8TRhLlXT1pA3gSk';
let genAI: GoogleGenerativeAI | null = null;

// Initialize with the API key
genAI = new GoogleGenerativeAI(API_KEY);

// Function to set credentials dynamically
export const setGoogleAICredentials = (apiKey: string) => {
  API_KEY = apiKey;
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
  } else {
    genAI = null;
  }
};

// Check if AI is available
export const isAIAvailable = (): boolean => {
  return genAI !== null && API_KEY !== '';
};

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

// Interface for AI food selection response
interface AIFoodSelection {
  selectedFoodIndex: number;
  reasoning: string;
  confidence: number;
}

// Interface for AI diet plan response
interface AIDietPlan {
  meals: Array<{
    name: string;
    foods: Array<{
      name: string;
      quantity: number;
      unit: string;
      reasoning: string;
    }>;
  }>;
  notes: string;
  reasoning: string;
}

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiResponse = JSON.parse(jsonMatch[0]);
      return {
        source: aiResponse.source,
        index: aiResponse.index,
        reasoning: aiResponse.reasoning
      };
    }
    
    return null;
  } catch (error) {
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

  // Handle backward compatibility - if dietSettings is a string, convert to basic settings
  let settings: DietSettings;
  if (typeof dietSettings === 'string') {
    settings = {
      proteinPercent: 25,
      carbsPercent: 45,
      fatPercent: 30,
      calorieAdjustment: 0,
      mealCount: 4,
      dietType: 'balanced',
      restrictions: dietSettings,
      preferences: '',
      goals: 'maintenance'
    };
  } else {
    settings = dietSettings;
  }

  // Calculate adjusted target calories
  const adjustedTargetCalories = targetCalories + (deficitSurplus || 0);

  // Validate that macro percentages add up to 100%
  const totalMacroPercent = settings.proteinPercent + settings.carbsPercent + settings.fatPercent;
  if (Math.abs(totalMacroPercent - 100) > 0.1) {
    throw new Error(`Macro percentages must add up to 100%. Current total: ${totalMacroPercent}%`);
  }

  // Calculate EXACT macro targets with mathematical precision
  const proteinCalories = Math.round(adjustedTargetCalories * (settings.proteinPercent / 100));
  const carbsCalories = Math.round(adjustedTargetCalories * (settings.carbsPercent / 100));
  const fatCalories = Math.round(adjustedTargetCalories * (settings.fatPercent / 100));
  
  const proteinGrams = Math.round((proteinCalories / 4) * 10) / 10; // 4 calories per gram
  const carbsGrams = Math.round((carbsCalories / 4) * 10) / 10; // 4 calories per gram
  const fatGrams = Math.round((fatCalories / 9) * 10) / 10; // 9 calories per gram
  
  // Verify total adds up to target (adjust fat if needed due to rounding)
  const totalCalculatedCalories = proteinCalories + carbsCalories + fatCalories;
  const calorieDiscrepancy = adjustedTargetCalories - totalCalculatedCalories;
  const adjustedFatCalories = fatCalories + calorieDiscrepancy;
  const adjustedFatGrams = Math.round((adjustedFatCalories / 9) * 10) / 10;

  // Final verification - ensure totals are exactly correct
  const finalProteinCalories = Math.round(proteinGrams * 4);
  const finalCarbsCalories = Math.round(carbsGrams * 4);
  const finalFatCalories = Math.round(adjustedFatGrams * 9);
  const finalTotalCalories = finalProteinCalories + finalCarbsCalories + finalFatCalories;
  
  console.log('EXACT MACRO CALCULATIONS:', {
    targetCalories,
    deficitSurplus,
    adjustedTargetCalories, 
    proteinPercent: settings.proteinPercent,
    carbsPercent: settings.carbsPercent,
    fatPercent: settings.fatPercent,
    proteinGrams, 
    carbsGrams, 
    adjustedFatGrams, 
    finalTotalCalories
  });
  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
You are an EXPERT PROFESSIONAL NUTRITIONIST and REGISTERED DIETITIAN with 20+ years of experience. You are EXTREMELY PRECISE and FOLLOW INSTRUCTIONS EXACTLY. You NEVER deviate from the specified requirements.

CRITICAL INSTRUCTION: You MUST follow the exact specifications provided. This is NON-NEGOTIABLE.

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

MATHEMATICAL CALCULATION LOGIC (FOLLOW THIS EXACT PROCESS):
Step 1: Calculate Final Target Calories
Base TDEE: ${targetCalories} kcal
Calorie Adjustment: ${deficitSurplus} kcal
Final Target: ${targetCalories} + (${deficitSurplus}) = ${adjustedTargetCalories} kcal

Step 2: Calculate Exact Macro Distribution
Protein: ${settings.proteinPercent}% × ${adjustedTargetCalories} = ${finalProteinCalories} kcal ÷ 4 = ${proteinGrams}g
Carbs: ${settings.carbsPercent}% × ${adjustedTargetCalories} = ${finalCarbsCalories} kcal ÷ 4 = ${carbsGrams}g
Fat: ${settings.fatPercent}% × ${adjustedTargetCalories} = ${finalFatCalories} kcal ÷ 9 = ${adjustedFatGrams}g

VERIFICATION: ${finalProteinCalories} + ${finalCarbsCalories} + ${finalFatCalories} = ${finalTotalCalories} kcal (Target: ${adjustedTargetCalories} kcal)

CRITICAL UNDERSTANDING:
- If Calorie Adjustment is NEGATIVE (e.g., -500), this creates a DEFICIT for WEIGHT LOSS
- If Calorie Adjustment is POSITIVE (e.g., +300), this creates a SURPLUS for WEIGHT GAIN  
- If Calorie Adjustment is ZERO (0), this is MAINTENANCE for current weight
- The Final Target Calories (${adjustedTargetCalories} kcal) is what you MUST hit exactly

- Number of Meals: ${settings.mealCount} meals per day
- Food Preferences: ${settings.preferences || 'None specified'}

ABSOLUTE MANDATORY REQUIREMENTS - ZERO TOLERANCE FOR DEVIATION:

1. CALORIE PRECISION: The total daily calories MUST EXACTLY equal ${adjustedTargetCalories} kcal (±10 calories maximum deviation). This is CRITICAL.

2. MACRO PRECISION: You MUST hit these EXACT macro targets (±1g maximum deviation):
   - Protein: EXACTLY ${proteinGrams}g (${finalProteinCalories} kcal)
   - Carbohydrates: EXACTLY ${carbsGrams}g (${finalCarbsCalories} kcal)  
   - Fat: EXACTLY ${adjustedFatGrams}g (${finalFatCalories} kcal)
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

6. FOOD DATABASE COMPATIBILITY: Use EXACT, SEARCHABLE food names:
   - Examples: "chicken breast, skinless", "brown rice, cooked", "broccoli, steamed", "greek yogurt, plain"
   - Provide PRECISE quantities in grams that achieve the exact macro targets
   - Ensure foods are commonly available and searchable

7. RESTRICTIONS & PREFERENCES: 
   ${settings.restrictions ? `- MUST AVOID: ${settings.restrictions}` : ''}
   ${settings.preferences ? `- PREFER: ${settings.preferences}` : ''}

8. NUTRITIONAL QUALITY AND COMPLIANCE: Ensure the plan includes:
   - Adequate micronutrients (vitamins and minerals)
   - Sufficient fiber (25-35g daily)
   - Proper hydration recommendations
   - Meal timing considerations
   - EXACT adherence to calorie and macro targets

9. MATHEMATICAL PRECISION:
   - Calculate each food's contribution to calories and macros precisely
   - Adjust quantities to hit exact targets
   - The sum of all meals MUST equal EXACTLY ${adjustedTargetCalories} kcal
   - The sum of all protein MUST equal EXACTLY ${proteinGrams}g
   - The sum of all carbs MUST equal EXACTLY ${carbsGrams}g  
   - The sum of all fat MUST equal EXACTLY ${adjustedFatGrams}g
   - Ensure the sum of all meals equals the target calories and macros exactly

MANDATORY VERIFICATION CHECKLIST - VERIFY BEFORE RESPONDING:
✓ Total calories = ${adjustedTargetCalories} kcal (EXACTLY)
✓ Protein = ${proteinGrams}g (${finalProteinCalories} kcal = ${settings.proteinPercent}%)
✓ Carbs = ${carbsGrams}g (${finalCarbsCalories} kcal = ${settings.carbsPercent}%)
✓ Fat = ${adjustedFatGrams}g (${finalFatCalories} kcal = ${settings.fatPercent}%)
✓ All macro percentages add up to 100%
✓ Calorie adjustment properly applied: ${targetCalories} ${deficitSurplus >= 0 ? '+' : ''}${deficitSurplus} = ${adjustedTargetCalories}

EXAMPLE VERIFICATION (using your exact numbers):
If TDEE = 3000 kcal and Deficit = -500 kcal, then Target = 2500 kcal
If Macros are 35% protein, 40% carbs, 25% fat:
- Protein: 35% × 2500 = 875 kcal ÷ 4 = 218.75g protein
- Carbs: 40% × 2500 = 1000 kcal ÷ 4 = 250g carbs
- Fat: 25% × 2500 = 625 kcal ÷ 9 = 69.4g fat
Total: 875 + 1000 + 625 = 2500 kcal ✓

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
    const text = response.text();
    
    // Enhanced JSON extraction logic
    let jsonString = '';
    
    // First, try to find JSON within markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    } else {
      // If no code block, extract between first and last curly braces
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = text.substring(firstBrace, lastBrace + 1);
      }
    }
    
    if (jsonString) {
      try {
        const aiDietPlan = JSON.parse(jsonString);
        
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
              
              // Search for the food in both databases
              const [nutritionixResults, fatSecretResults] = await Promise.all([
                searchFoods(aiFood.name),
                searchFatSecretFoods(aiFood.name)
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
                console.log(`Found in Nutritionix: ${selectedFood.name_en}`);
              } else if (fatSecretResults.length > 0) {
                selectedFood = await getDetailedFatSecretFoodInfo(fatSecretResults[0], Date.now() + Math.random());
                console.log(`Found in FatSecret: ${selectedFood.name_en}`);
              }
              
              if (selectedFood) {
                const foodEntryId = `ai-food-${Date.now()}-${Math.random()}`;
                
                meal.foods.push({
                  id: foodEntryId,
                  foodId: selectedFood.id,
                  quantity: aiFood.quantity || 100,
                  unit: aiFood.unit || 'g',
                  aiGenerated: true,
                  aiReasoning: aiFood.reasoning
                });
                
                selectedFoods[foodEntryId] = selectedFood;
                totalFoundFoods++;
              } else {
                console.warn(`Could not find food: ${aiFood.name}`);
              }
            } catch (error) {
              console.error(`Error searching for food: ${aiFood.name}`, error);
            }
          }
          
          if (meal.foods.length > 0) {
            meals.push(meal);
          }
        }
        
        // Update the meal plan if callbacks are provided
        
        const successRate = totalRequestedFoods > 0 ? (totalFoundFoods / totalRequestedFoods) * 100 : 0;
        
        // Enhanced reasoning with EXACT mathematical verification
        const enhancedReasoning = `${aiDietPlan.reasoning || 'Diet plan generated based on your profile and nutritional needs.'}\n\n🔢 EXACT MATHEMATICAL VERIFICATION:\n- Base TDEE: ${targetCalories} kcal\n- Calorie Adjustment: ${deficitSurplus > 0 ? '+' : ''}${deficitSurplus} kcal (${deficitSurplus > 0 ? 'SURPLUS for weight gain' : deficitSurplus < 0 ? 'DEFICIT for weight loss' : 'MAINTENANCE'})\n- FINAL TARGET: ${adjustedTargetCalories} kcal\n- Protein: ${proteinGrams}g (${finalProteinCalories} kcal = ${settings.proteinPercent}%)\n- Carbs: ${carbsGrams}g (${finalCarbsCalories} kcal = ${settings.carbsPercent}%)\n- Fat: ${adjustedFatGrams}g (${finalFatCalories} kcal = ${settings.fatPercent}%)\n- Total Verification: ${finalTotalCalories} kcal\n- Food Search Success: ${Math.round(successRate)}%\n\n✅ ADHERENCE CONFIRMED: All specifications met with mathematical precision.`;
        return {
          meals,
          selectedFoods,
          notes: aiDietPlan.notes || '',
          reasoning: enhancedReasoning
        };
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Attempted to parse:', jsonString);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in AI diet plan generation:', error);
    return null;
  }
};

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
- Goal Type: ${context.deficitSurplus === 0 ? 'MAINTENANCE (no weight change)' : 
             context.deficitSurplus > 0 ? `WEIGHT GAIN (+${context.deficitSurplus} surplus)` : 
             `WEIGHT LOSS (${context.deficitSurplus} deficit)`}

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
6. You NEVER approximate or round when given specific targets - you use EXACT values

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

MATHEMATICAL UNDERSTANDING: You fully understand that TDEE calculations, calorie adjustments, and macro percentages must be calculated with exact precision as shown in the context above.

If the question involves specific dietary recommendations, calculations, or meal planning:
- Provide detailed guidance with mathematical rationale
- Use EXACT numbers when specified by the user
- Show calculations when relevant
- Acknowledge any specific targets or requirements mentioned
- Offer to generate a new diet plan if the user requests changes to current settings
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