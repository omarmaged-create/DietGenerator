import CryptoJS from 'crypto-js';

interface FatSecretFood {
  food_id: string;
  food_name: string;
  food_type: string;
  brand_name?: string;
  food_description: string;
}

interface FatSecretSearchResponse {
  foods: {
    food: FatSecretFood[];
    max_results: string;
    page_number: string;
    total_results: string;
  };
}

interface FatSecretFoodDetails {
  food: {
    food_id: string;
    food_name: string;
    food_type: string;
    brand_name?: string;
    servings: {
      serving: Array<{
        calcium?: string;
        calories: string;
        carbohydrate: string;
        cholesterol?: string;
        fat: string;
        fiber?: string;
        iron?: string;
        measurement_description: string;
        metric_serving_amount?: string;
        metric_serving_unit?: string;
        monounsaturated_fat?: string;
        number_of_units?: string;
        polyunsaturated_fat?: string;
        potassium?: string;
        protein: string;
        saturated_fat?: string;
        serving_description: string;
        serving_id: string;
        serving_url?: string;
        sodium?: string;
        sugar?: string;
        trans_fat?: string;
        vitamin_a?: string;
        vitamin_c?: string;
      }>;
    };
  };
}

// Dynamic credentials that can be set at runtime
let CONSUMER_KEY = import.meta.env.VITE_FATSECRET_CONSUMER_KEY || 'b829e96cbf9448fd931f7d6f8a733ecc';
let CONSUMER_SECRET = import.meta.env.VITE_FATSECRET_CONSUMER_SECRET || 'fae1f68137684764a9bd9df00789ce38';

// Function to set credentials dynamically
export const setFatSecretCredentials = (consumerKey: string, consumerSecret: string) => {
  CONSUMER_KEY = consumerKey;
  CONSUMER_SECRET = consumerSecret;
};

// OAuth 1.0 signature generation for FatSecret API
const generateOAuthSignature = (method: string, url: string, params: Record<string, string>) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(CONSUMER_SECRET)}&`;
  
  // Use proper HMAC-SHA1 signature
  const signature = CryptoJS.HmacSHA1(baseString, signingKey);
  return CryptoJS.enc.Base64.stringify(signature);
};

const makeOAuthRequest = async (method: string, endpoint: string, params: Record<string, string> = {}) => {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    console.warn('FatSecret API credentials not set. Please enter your Consumer Key and Consumer Secret in the credentials section.');
    return null;
  }

  const actualApiUrl = 'https://platform.fatsecret.com/rest/server.api';
  const proxyUrl = '/api/fatsecret';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);

  const oauthParams = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0',
    format: 'json',
    ...params
  };

  const signature = generateOAuthSignature(method, actualApiUrl, oauthParams);
  oauthParams.oauth_signature = signature;

  const queryString = Object.keys(oauthParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
    .join('&');

  try {
    const response = await fetch(`${proxyUrl}?${queryString}`, {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`FatSecret API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('FatSecret API error:', error);
    return null;
  }
};

export const searchFatSecretFoods = async (query: string): Promise<FatSecretFood[]> => {
  if (!query.trim()) return [];
  
  try {
    const data = await makeOAuthRequest('GET', '', {
      method: 'foods.search',
      search_expression: query,
      max_results: '20'
    });

    if (data && data.foods && data.foods.food) {
      return Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food];
    }
    
    return [];
  } catch (error) {
    console.error('Error searching FatSecret foods:', error);
    return [];
  }
};

export const getFatSecretFoodDetails = async (foodId: string): Promise<FatSecretFoodDetails | null> => {
  try {
    const data = await makeOAuthRequest('GET', '', {
      method: 'food.get',
      food_id: foodId
    });

    return data || null;
  } catch (error) {
    console.error('Error getting FatSecret food details:', error);
    return null;
  }
};

// Convert FatSecret food to our FoodItem format
export const convertFatSecretToFoodItem = (
  fatSecretFood: FatSecretFood, 
  details: FatSecretFoodDetails | null,
  id: number
): import('../utils/calculations').FoodItem => {
  // Default values
  let calories_per_100g = 0;
  let protein_g_per_100g = 0;
  let carbs_g_per_100g = 0;
  let fat_g_per_100g = 0;
  let defaultUnit = 'g';
  let altMeasures: any[] = [];

  if (details && details.food && details.food.servings && details.food.servings.serving) {
    const servingsRaw = details.food.servings.serving;
    const servings = Array.isArray(servingsRaw) ? servingsRaw : [servingsRaw];
    
    // Find the 100g serving or use the first serving to calculate per 100g
    let baseServing = servings.find(s => 
      s.metric_serving_unit === 'g' && s.metric_serving_amount === '100'
    ) || servings[0];

    if (baseServing) {
      const servingAmount = parseFloat(baseServing.metric_serving_amount || baseServing.metric_serving_amount === '' ? '100' : '100');
      const multiplier = servingAmount > 0 ? 100 / servingAmount : 1;

      const cal = baseServing.calories || '0';
      const prot = baseServing.protein || '0';
      const carb = baseServing.carbohydrate || '0';
      const f = baseServing.fat || '0';

      calories_per_100g = Math.round(parseFloat(cal) * multiplier);
      protein_g_per_100g = Math.round(parseFloat(prot) * multiplier * 10) / 10;
      carbs_g_per_100g = Math.round(parseFloat(carb) * multiplier * 10) / 10;
      fat_g_per_100g = Math.round(parseFloat(f) * multiplier * 10) / 10;
      
      defaultUnit = baseServing.metric_serving_unit || baseServing.measurement_description || 'g';

      // Convert all servings to alternative measures defensively
      altMeasures = servings.map((serving: any, index: number) => ({
        serving_weight: parseFloat(serving.metric_serving_amount || '100'),
        measure: serving.measurement_description || serving.serving_description || `serving ${index + 1}`,
        seq: index + 1,
        qty: parseFloat(serving.number_of_units || '1')
      }));
    }
  }

  return {
    id,
    name_en: fatSecretFood.food_name,
    name_ar: fatSecretFood.food_name, // Use English name for Arabic too for now
    calories_per_100g,
    protein_g_per_100g,
    carbs_g_per_100g,
    fat_g_per_100g,
    defaultUnit,
    altMeasures
  };
};

// Get detailed food information with macros
export const getDetailedFatSecretFoodInfo = async (
  fatSecretFood: FatSecretFood, 
  id: number
): Promise<import('../utils/calculations').FoodItem> => {
  try {
    const details = await getFatSecretFoodDetails(fatSecretFood.food_id);
    return convertFatSecretToFoodItem(fatSecretFood, details, id);
  } catch (error) {
    console.error('Error getting detailed FatSecret food info:', error);
    // Return basic food item with minimal info
    return {
      id,
      name_en: fatSecretFood.food_name,
      name_ar: fatSecretFood.food_name,
      calories_per_100g: 0,
      protein_g_per_100g: 0,
      carbs_g_per_100g: 0,
      fat_g_per_100g: 0,
      defaultUnit: 'g',
      altMeasures: []
    };
  }
};