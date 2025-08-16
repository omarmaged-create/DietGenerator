// Demo runner to invoke generateDietPlan and capture aiDebug traces.
import 'dotenv/config';
import { setGoogleAICredentials, generateDietPlan, isAIAvailable } from '../src/services/googleAiService';
import { setNutritionixCredentials } from '../src/services/nutritionixApi';

async function run() {
  // Set credentials from env if provided
  const env: any = (globalThis as any).process ? (globalThis as any).process.env : {};
  const googleKey = env.GOOGLE_API_KEY || '';
  const nutAppId = env.NUTRITIONIX_APP_ID || '';
  const nutKey = env.NUTRITIONIX_API_KEY || '';

  if (googleKey) setGoogleAICredentials(googleKey);
  if (nutAppId || nutKey) setNutritionixCredentials(nutAppId, nutKey);

  console.log('AI available:', isAIAvailable());

  const clientData = {
    age: 30,
    weightKg: 80,
    heightCm: 180,
    sex: 'male'
  } as any;

  const settings = {
    targetCalories: 2500,
    proteinPercent: 30,
    carbsPercent: 40,
    fatPercent: 30,
    preferences: [],
    strictPreferences: false,
  } as any;

  try {
    const res = await generateDietPlan(clientData, settings);
    console.log('generateDietPlan result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error running demo:', err);
  }
}

run();
