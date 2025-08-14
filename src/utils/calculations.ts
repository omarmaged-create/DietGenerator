export interface ClientData {
  nameEn?: string;
  nameAr?: string;
  height: number;
  weight: number;
  age: number;
  gender: 'male' | 'female';
  activityMultiplier: number;
}

export const calculateBMR = (data: ClientData): number => {
  const { height, weight, age, gender } = data;
  
  // Mifflin-St Jeor Equation
  const mifflinStJeor = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  
  // Harris-Benedict Equation (Revised)
  const harrisBenedict = gender === 'male'
    ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  
  // Return average of both equations
  return (mifflinStJeor + harrisBenedict) / 2;
};

export const calculateTDEE = (data: ClientData): number => {
  const bmr = calculateBMR(data);
  return bmr * data.activityMultiplier;
};

export interface FoodItem {
  id: number;
  name_en: string;
  name_ar: string;
  calories_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  defaultUnit?: string;
  servingInfo?: {
    serving_weight_grams?: number;
    serving_qty?: number;
    serving_unit?: string;
  };
  altMeasures?: Array<{
    serving_weight: number;
    measure: string;
    seq: number;
    qty: number;
  }>;
}

export interface FoodEntry {
  id: string;
  foodId: number;
  quantity: number;
  unit?: string;
  isAlternative?: boolean;
  parentId?: string;
}

export const calculateFoodMacros = (food: FoodItem, quantity: number) => {
  const multiplier = quantity / 100;
  return {
    calories: Math.round(food.calories_per_100g * multiplier),
    protein: Math.round(food.protein_g_per_100g * multiplier * 10) / 10,
    carbs: Math.round(food.carbs_g_per_100g * multiplier * 10) / 10,
    fat: Math.round(food.fat_g_per_100g * multiplier * 10) / 10
  };
};
export const calculateAlignedQuantity = (
  targetFood: FoodItem,
  targetQuantity: number,
  alternativeFood: FoodItem,
  alignmentType: 'calories' | 'protein' | 'carbs' | 'fat' | 'general' = 'calories'
): number => {
  if (!targetFood || !alternativeFood || !targetQuantity) return 0;
  
  const targetMacros = calculateFoodMacros(targetFood, targetQuantity);
  
  let alignedQuantity: number;
  
  if (alignmentType === 'calories') {
    // Align by calories
    alignedQuantity = (targetMacros.calories * 100) / alternativeFood.calories_per_100g;
  } else if (alignmentType === 'protein') {
    // Align by protein
    alignedQuantity = (targetMacros.protein * 100) / alternativeFood.protein_g_per_100g;
  } else if (alignmentType === 'carbs') {
    // Align by carbs
    alignedQuantity = (targetMacros.carbs * 100) / alternativeFood.carbs_g_per_100g;
  } else if (alignmentType === 'fat') {
    // Align by fat
    alignedQuantity = (targetMacros.fat * 100) / alternativeFood.fat_g_per_100g;
  } else if (alignmentType === 'general') {
    // General alignment - find the best balance across all macros
    const calorieQuantity = (targetMacros.calories * 100) / alternativeFood.calories_per_100g;
    const proteinQuantity = (targetMacros.protein * 100) / alternativeFood.protein_g_per_100g;
    const carbsQuantity = (targetMacros.carbs * 100) / alternativeFood.carbs_g_per_100g;
    const fatQuantity = (targetMacros.fat * 100) / alternativeFood.fat_g_per_100g;
    
    // Calculate weighted average with calories having highest priority
    alignedQuantity = (calorieQuantity * 0.4 + proteinQuantity * 0.3 + carbsQuantity * 0.15 + fatQuantity * 0.15);
  }
  
  // Round to nearest 5g for practical portions
  return Math.round(alignedQuantity / 5) * 5;
};

export const calculateMacroSimilarity = (
  food1: FoodItem,
  quantity1: number,
  food2: FoodItem,
  quantity2: number
): { similarity: number; differences: { calories: number; protein: number; carbs: number; fat: number } } => {
  const macros1 = calculateFoodMacros(food1, quantity1);
  const macros2 = calculateFoodMacros(food2, quantity2);
  
  const differences = {
    calories: macros2.calories - macros1.calories,
    protein: Math.round((macros2.protein - macros1.protein) * 10) / 10,
    carbs: Math.round((macros2.carbs - macros1.carbs) * 10) / 10,
    fat: Math.round((macros2.fat - macros1.fat) * 10) / 10
  };
  
  // Calculate similarity score (0-100%)
  const caloriesSimilarity = Math.max(0, 100 - Math.abs(differences.calories / macros1.calories * 100));
  const proteinSimilarity = Math.max(0, 100 - Math.abs(differences.protein / Math.max(macros1.protein, 0.1) * 100));
  const carbsSimilarity = Math.max(0, 100 - Math.abs(differences.carbs / Math.max(macros1.carbs, 0.1) * 100));
  const fatSimilarity = Math.max(0, 100 - Math.abs(differences.fat / Math.max(macros1.fat, 0.1) * 100));
  
  const similarity = (caloriesSimilarity * 0.4 + proteinSimilarity * 0.3 + carbsSimilarity * 0.15 + fatSimilarity * 0.15);
  
  return { similarity: Math.round(similarity), differences };
};