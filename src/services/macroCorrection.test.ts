import { describe, it, expect } from 'vitest';
import { macroCorrectionLoop } from './googleAiService';

describe('macroCorrectionLoop', () => {
  it('adds a correction meal when protein is deficient', async () => {
    // Synthetic selectedFoods mimicking fallback profiles
  // Use full FoodItem-shaped fixtures to satisfy types
  const selectedFoods: { [key: string]: any } = {
    'f-chicken': {
      id: 101,
      name_en: 'chicken breast, skinless',
      name_ar: 'صدر دجاج',
      calories_per_100g: 165,
      protein_g_per_100g: 31,
      carbs_g_per_100g: 0,
      fat_g_per_100g: 3.6,
      defaultUnit: 'g'
    },
    'f-rice': {
      id: 102,
      name_en: 'brown rice, cooked',
      name_ar: 'أرز بني',
      calories_per_100g: 123,
      protein_g_per_100g: 2.7,
      carbs_g_per_100g: 25.6,
      fat_g_per_100g: 1,
      defaultUnit: 'g'
    }
  };

    // One meal with low protein relative to targets
    const meals = [
      {
        id: 'm1',
        name: 'Lunch',
        foods: [
          { id: 'f-chicken', foodId: 'f-chicken', quantity: 100, unit: 'g' },
          { id: 'f-rice', foodId: 'f-rice', quantity: 200, unit: 'g' }
        ]
      }
    ];

    // Targets intentionally require more protein than current plan provides
    const targets = { calories: 1500, protein: 120, carbs: 150, fat: 50 };

  const res = await macroCorrectionLoop(meals, selectedFoods as any, targets, { maxCandidates: 3, maxCorrectionCalories: 800 });

    expect(res).toBeDefined();
    expect(res.correctionMealAdded).toBe(true);
    // Verify the last meal is the correction meal
    const lastMeal = res.meals[res.meals.length - 1];
    expect(lastMeal).toBeDefined();
    expect(lastMeal.name).toBe('Macro correction');
    expect(lastMeal.foods.length).toBeGreaterThan(0);
  });
});
