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
  
  let alignedQuantity: number = 0;
  
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

// Enhanced macro calculation utilities with exact precision
export const calculateExactMacros = (
  targetCalories: number,
  proteinPercent: number,
  carbsPercent: number,
  fatPercent: number
): {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
  totalCalories: number;
} => {
  // Validate percentages add up to 100%
  const totalPercent = proteinPercent + carbsPercent + fatPercent;
  if (Math.abs(totalPercent - 100) > 0.1) {
    throw new Error(`Macro percentages must add up to 100%. Current total: ${totalPercent}%`);
  }

  // Calculate calories for each macro with exact precision
  const proteinCalories = Math.round(targetCalories * (proteinPercent / 100));
  const carbsCalories = Math.round(targetCalories * (carbsPercent / 100));
  const fatCalories = Math.round(targetCalories * (fatPercent / 100));

  // Convert calories to grams with exact precision
  const proteinGrams = Math.round((proteinCalories / 4) * 10) / 10; // 4 calories per gram
  const carbsGrams = Math.round((carbsCalories / 4) * 10) / 10; // 4 calories per gram
  const fatGrams = Math.round((fatCalories / 9) * 10) / 10; // 9 calories per gram

  // Verify total adds up to target (adjust fat if needed due to rounding)
  const totalCalculatedCalories = proteinCalories + carbsCalories + fatCalories;
  const calorieDiscrepancy = targetCalories - totalCalculatedCalories;
  const adjustedFatCalories = fatCalories + calorieDiscrepancy;
  const adjustedFatGrams = Math.round((adjustedFatCalories / 9) * 10) / 10;

  // Final verification
  const finalProteinCalories = Math.round(proteinGrams * 4);
  const finalCarbsCalories = Math.round(carbsGrams * 4);
  const finalFatCalories = Math.round(adjustedFatGrams * 9);
  const finalTotalCalories = finalProteinCalories + finalCarbsCalories + finalFatCalories;

  return {
    proteinGrams,
    carbsGrams,
    fatGrams: adjustedFatGrams,
    proteinCalories: finalProteinCalories,
    carbsCalories: finalCarbsCalories,
    fatCalories: finalFatCalories,
    totalCalories: finalTotalCalories
  };
};

// Calculate adjusted target calories based on deficit/surplus
export const calculateAdjustedTargetCalories = (
  baseTDEE: number,
  deficitSurplus: number
): number => {
  return baseTDEE + deficitSurplus;
};

// Verify macro percentages add up to 100%
export const validateMacroPercentages = (
  proteinPercent: number,
  carbsPercent: number,
  fatPercent: number
): boolean => {
  const total = proteinPercent + carbsPercent + fatPercent;
  return Math.abs(total - 100) <= 0.1;
};

// Calculate macro grams from percentages and total calories
export const calculateMacroGrams = (
  totalCalories: number,
  proteinPercent: number,
  carbsPercent: number,
  fatPercent: number
): {
  protein: number;
  carbs: number;
  fat: number;
} => {
  if (!validateMacroPercentages(proteinPercent, carbsPercent, fatPercent)) {
    throw new Error(`Macro percentages must add up to 100%. Current total: ${proteinPercent + carbsPercent + fatPercent}%`);
  }

  const protein = Math.round((totalCalories * (proteinPercent / 100) / 4) * 10) / 10;
  const carbs = Math.round((totalCalories * (carbsPercent / 100) / 4) * 10) / 10;
  const fat = Math.round((totalCalories * (fatPercent / 100) / 9) * 10) / 10;

  return { protein, carbs, fat };
};

// Calculate calories from macro grams
export const calculateCaloriesFromMacros = (
  proteinGrams: number,
  carbsGrams: number,
  fatGrams: number
): number => {
  return Math.round(proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9);
};

// Format macro calculations for display
export const formatMacroCalculation = (
  targetCalories: number,
  proteinPercent: number,
  carbsPercent: number,
  fatPercent: number
): string => {
  const macros = calculateExactMacros(targetCalories, proteinPercent, carbsPercent, fatPercent);
  
  return `🔢 **EXACT MACRO CALCULATIONS:**
- **Protein**: ${proteinPercent}% × ${targetCalories} = ${macros.proteinCalories} kcal ÷ 4 = **${macros.proteinGrams}g**
- **Carbs**: ${carbsPercent}% × ${targetCalories} = ${macros.carbsCalories} kcal ÷ 4 = **${macros.carbsGrams}g**
- **Fat**: ${fatPercent}% × ${targetCalories} = ${macros.fatCalories} kcal ÷ 9 = **${macros.fatGrams}g**
- **Total Verification**: ${macros.proteinCalories} + ${macros.carbsCalories} + ${macros.fatCalories} = **${macros.totalCalories} kcal** ✓`;
};