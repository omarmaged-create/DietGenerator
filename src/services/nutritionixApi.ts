interface NutritionixFood {
  food_name: string;
  brand_name?: string;
  serving_qty: number;
  serving_unit: string;
  serving_weight_grams: number;
  nf_calories: number;
  nf_total_fat: number;
  nf_total_carbohydrate: number;
  nf_protein: number;
  nix_brand_id?: string;
  nix_item_id?: string;
  alt_measures?: Array<{
    serving_weight: number;
    measure: string;
    seq: number;
    qty: number;
  }>;
  photo?: {
    thumb: string;
  };
}

interface NutritionixSearchResponse {
  common: NutritionixFood[];
  branded: NutritionixFood[];
}

interface NutritionixNutrientsResponse {
  foods: NutritionixFood[];
}

const API_BASE_URL = 'https://trackapi.nutritionix.com/v2';

// Dynamic credentials that can be set at runtime
// Default to user-provided credentials if env not set
let APP_ID = import.meta.env.VITE_NUTRITIONIX_APP_ID || 'dac811e1';
let API_KEY = import.meta.env.VITE_NUTRITIONIX_API_KEY || '81154a153e22a0cca3f680ba50152bec';

// Function to set credentials dynamically
export const setNutritionixCredentials = (appId: string, apiKey: string) => {
  APP_ID = appId;
  API_KEY = apiKey;
};

// headers are created per-request to pick up runtime credentials

export const searchFoods = async (query: string): Promise<NutritionixFood[]> => {
  if (!query.trim()) return [];
  
  // Check if credentials are set
  if (!APP_ID || !API_KEY) {
    console.warn('Nutritionix API credentials not set. Please enter your App ID and API Key in the credentials section.');
    return [];
  }
  
  try {
    console.log('Searching for:', query);
    
    const requestHeaders = {
      'x-app-id': APP_ID,
      'x-app-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const response = await fetch(`${API_BASE_URL}/search/instant?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: requestHeaders,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `API request failed: ${response.status} ${response.statusText} ${body ? '- ' + body : ''}`;
      // Provide more explicit error for 401 to help diagnostics
      if (response.status === 401) console.error('[Nutritionix] Unauthorized (401). Check App ID / API Key and CORS settings. Response body:', body);
      throw new Error(msg);
    }

    const data: NutritionixSearchResponse = await response.json();
    console.log('[Nutritionix] API Response:', data);
    
    // Combine common and branded foods, limit to 20 results
    const allFoods = [...data.common, ...data.branded].slice(0, 20);
    console.log('All foods found:', allFoods);
    
    return allFoods;
  } catch (error) {
    console.error('Error searching foods:', error);
    return [];
  }
};

export const getFoodNutrients = async (foodName: string, servingQty?: number, servingUnit?: string): Promise<NutritionixFood | null> => {
  try {
    // Check if credentials are set
    if (!APP_ID || !API_KEY) {
      console.warn('Nutritionix API credentials not set');
      return null;
    }
    
    const requestHeaders = {
      'x-app-id': APP_ID,
      'x-app-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    // Build query with serving information if available
    const query = servingQty && servingUnit ? 
      `${servingQty} ${servingUnit} ${foodName}` : 
      foodName;
    
    const response = await fetch(`${API_BASE_URL}/natural/nutrients`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        query: query,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `API request failed: ${response.status} ${response.statusText} ${body ? '- ' + body : ''}`;
      if (response.status === 401) console.error('[Nutritionix] Unauthorized (401) when fetching nutrients. Response body:', body);
      throw new Error(msg);
    }

    const data: NutritionixNutrientsResponse = await response.json();
    console.log('[Nutritionix] Nutrients API Response:', data);
    
    return data.foods[0] || null;
  } catch (error) {
    console.error('Error getting food nutrients:', error);
    return null;
  }
};

// Convert Nutritionix food to our FoodItem format
export const convertToFoodItem = (nutritionixFood: NutritionixFood, id: number, hasDetailedNutrients = false): import('../utils/calculations').FoodItem => {
  // Calculate per 100g values
  const weightInGrams = nutritionixFood.serving_weight_grams || 100;
  const multiplier = 100 / weightInGrams;
  
  console.log('Converting Nutritionix food:', {
    food_name: nutritionixFood.food_name,
    serving_weight_grams: nutritionixFood.serving_weight_grams,
    nf_calories: nutritionixFood.nf_calories,
    nf_protein: nutritionixFood.nf_protein,
    nf_total_carbohydrate: nutritionixFood.nf_total_carbohydrate,
    nf_total_fat: nutritionixFood.nf_total_fat,
    alt_measures: nutritionixFood.alt_measures,
    multiplier: multiplier,
    hasDetailedNutrients
  });
  
  const convertedFood = {
    id,
    name_en: nutritionixFood.food_name,
    name_ar: nutritionixFood.food_name, // For now, use English name for Arabic too
    calories_per_100g: Math.round((nutritionixFood.nf_calories || 0) * multiplier),
    protein_g_per_100g: Math.round(((nutritionixFood.nf_protein || 0) * multiplier) * 10) / 10,
    carbs_g_per_100g: Math.round(((nutritionixFood.nf_total_carbohydrate || 0) * multiplier) * 10) / 10,
    fat_g_per_100g: Math.round(((nutritionixFood.nf_total_fat || 0) * multiplier) * 10) / 10,
    // Use the original serving unit from Nutritionix
    defaultUnit: nutritionixFood.serving_unit || 'g',
    // Store alternative measures for unit conversion
    altMeasures: nutritionixFood.alt_measures || []
  };
  
  console.log('Converted food item:', convertedFood);
  
  return convertedFood;
};

// Get detailed food information with macros
export const getDetailedFoodInfo = async (nutritionixFood: NutritionixFood, id: number): Promise<import('../utils/calculations').FoodItem> => {
  try {
    // Get detailed nutrients for this food
    const detailedFood = await getFoodNutrients(
      nutritionixFood.food_name,
      nutritionixFood.serving_qty,
      nutritionixFood.serving_unit
    );
    
    if (detailedFood) {
      // Use detailed information
      return convertToFoodItem(detailedFood, id, true);
    } else {
      // Fallback to basic information (calories only)
      console.warn('Could not get detailed nutrients for:', nutritionixFood.food_name);
      return convertToFoodItem(nutritionixFood, id, false);
    }
  } catch (error) {
    console.error('Error getting detailed food info:', error);
    // Fallback to basic information
    return convertToFoodItem(nutritionixFood, id, false);
  }
};