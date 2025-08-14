import { translations, Language } from './translations';
import { ClientData, FoodItem, calculateFoodMacros } from './calculations';
import { convertToGrams } from './unitConversions';

interface Exercise {
  id: string;
  name: string;
  type: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  instructions: string;
  instructionsAr?: string;
}

interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: number;
  reps: string;
  weight?: number;
  duration?: number;
  restTime?: number;
  notes?: string;
  videoUrl?: string;
}

interface DayWorkout {
  id: string;
  day: string;
  displayName: string;
  isRestDay: boolean;
  exercises: WorkoutExercise[];
  notes?: string;
}

interface Meal {
  id: string;
  name: string;
  foods: any[];
}

export const generatePDF = async (
  clientData: Partial<ClientData>,
  meals: Meal[],
  selectedFoods: { [key: string]: FoodItem },
  notes: string,
  targetCalories: number,
  currentTotals: { calories: number; protein: number; carbs: number; fat: number },
  language: Language,
  workouts?: DayWorkout[],
  selectedExercises?: { [key: string]: Exercise },
  deficitSurplus?: number
) => {
  const t = translations[language];
  const isRTL = language === 'ar';
  
  // Calculate adjusted target calories
  const adjustedTargetCalories = targetCalories + (deficitSurplus || 0);
  
  // Calculate totals
  const totals = meals.reduce((acc, meal) => {
    meal.foods.forEach(foodEntry => {
      // Skip alternatives in calculations - only count main foods
      if (foodEntry.isAlternative) {
        return;
      }
      
      const food = selectedFoods[foodEntry.id];
      if (food && foodEntry.quantity) {
        // Convert quantity to grams for calculation
        const quantityInGrams = convertToGrams(
          foodEntry.quantity,
          foodEntry.unit || 'g',
          food.servingInfo?.serving_weight_grams,
          food.servingInfo?.serving_qty,
          food.servingInfo?.serving_unit,
          food.altMeasures
        );
        const macros = calculateFoodMacros(food, quantityInGrams);
        acc.calories += macros.calories;
        acc.protein += macros.protein;
        acc.carbs += macros.carbs;
        acc.fat += macros.fat;
      }
    });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Generate PDF title with client name and date
  const clientName = language === 'ar' ? clientData.nameAr : clientData.nameEn;
  const pdfTitle = clientName ? 
    `${clientName}'s ${t.dietPlan} - ${new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}` :
    `${t.dietPlan} - ${new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}`;

  const calculateMealTotals = (meal: Meal) => {
    return meal.foods.reduce((mealTotals, foodEntry) => {
      // Skip alternatives in calculations - only count main foods
      if (foodEntry.isAlternative) {
        return mealTotals;
      }
      
      const food = selectedFoods[foodEntry.id];
      if (food && foodEntry.quantity) {
        // Convert quantity to grams for calculation
        const quantityInGrams = convertToGrams(
          foodEntry.quantity,
          foodEntry.unit || 'g',
          food.servingInfo?.serving_weight_grams,
          food.servingInfo?.serving_qty,
          food.servingInfo?.serving_unit,
          food.altMeasures
        );
        const macros = calculateFoodMacros(food, quantityInGrams);
        mealTotals.calories += macros.calories;
        mealTotals.protein += macros.protein;
        mealTotals.carbs += macros.carbs;
        mealTotals.fat += macros.fat;
      }
      return mealTotals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html ${isRTL ? 'dir="rtl"' : ''}>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          ${isRTL ? 'direction: rtl; text-align: right;' : ''}
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          background-color: white;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: ${isRTL ? 'right' : 'left'};
          vertical-align: top;
        }
        th {
          background-color: #f8f9fa;
          font-weight: bold;
          color: #495057;
        }
        tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .exercise-instructions {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
          margin-top: 5px;
        }
        .video-link {
          color: #007bff;
          text-decoration: underline;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #3B82F6;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #3B82F6;
          margin: 0;
        }
        .client-name {
          background-color: #F0F9FF;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          ${isRTL ? 'border-right: 4px solid #3B82F6;' : 'border-left: 4px solid #3B82F6;'}
        }
        .client-info {
          background-color: #F3F4F6;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .summary {
          background-color: #EFF6FF;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .dashboard-data {
          background-color: #F0FDF4;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border: 2px solid #10B981;
        }
        .meal {
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .meal-header {
          background-color: #F9FAFB;
          padding: 10px;
          margin: -20px -20px 15px -20px;
          border-radius: 8px 8px 0 0;
          border-bottom: 1px solid #E5E7EB;
        }
        .food-item {
          padding: 10px 0;
          border-bottom: 1px solid #F3F4F6;
        }
        .food-item:last-child {
          border-bottom: none;
        }
        .alternative {
          ${isRTL ? 'margin-right: 20px;' : 'margin-left: 20px;'}
          color: #F97316;
          font-style: italic;
        }
        .macros {
          color: #6B7280;
          font-size: 14px;
        }
        .protein { color: #EF4444; }
        .carbs { color: #F59E0B; }
        .fat { color: #8B5CF6; }
        .notes {
          background-color: #FFFBEB;
          padding: 20px;
          border-radius: 8px;
          ${isRTL ? 'border-right: 4px solid #F59E0B;' : 'border-left: 4px solid #F59E0B;'}
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 600px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${pdfTitle}</h1>
      </div>

      <div class="client-info">
        <h2>${t.clientData}</h2>
        <div class="grid">
          <div>
            <p><strong>${t.height}:</strong> ${clientData.height || 'N/A'} cm</p>
            <p><strong>${t.weight}:</strong> ${clientData.weight || 'N/A'} kg</p>
          </div>
          <div>
            <p><strong>${t.age}:</strong> ${clientData.age || 'N/A'} years</p>
            <p><strong>${t.gender}:</strong> ${clientData.gender ? t[clientData.gender] : 'N/A'}</p>
          </div>
        </div>
      </div>

      <div class="dashboard-data">
        <h2>${t.dailySummary}</h2>
        ${deficitSurplus !== undefined && deficitSurplus !== 0 ? `
          <div style="background-color: ${deficitSurplus > 0 ? '#F0FDF4' : '#FEF2F2'}; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 2px solid ${deficitSurplus > 0 ? '#10B981' : '#EF4444'};">
            <div style="font-weight: bold; color: ${deficitSurplus > 0 ? '#059669' : '#DC2626'};">
              Calorie Adjustment: ${deficitSurplus > 0 ? '+' : ''}${deficitSurplus} calories (${deficitSurplus > 0 ? 'Surplus' : 'Deficit'})
            </div>
            <div style="font-size: 14px; color: #6B7280; margin-top: 5px;">
              Base TDEE: ${Math.round(targetCalories)} ${t.kcal} → Adjusted Target: ${Math.round(adjustedTargetCalories)} ${t.kcal}
            </div>
          </div>
        ` : ''}
        <table>
          <tr>
            <th>${t.targetCalories}</th>
            <th>${t.currentCalories}</th>
            <th>${t.remainingCalories}</th>
            <th>${t.protein}</th>
            <th>${t.carbohydrates}</th>
            <th>${t.fat}</th>
          </tr>
          <tr>
            <td>${Math.round(adjustedTargetCalories)} ${t.kcal}</td>
            <td>${Math.round(currentTotals.calories)} ${t.kcal}</td>
            <td>${Math.round(adjustedTargetCalories - currentTotals.calories)} ${t.kcal}</td>
            <td class="protein">${Math.round(currentTotals.protein * 10) / 10}${t.grams}</td>
            <td class="carbs">${Math.round(currentTotals.carbs * 10) / 10}${t.grams}</td>
            <td class="fat">${Math.round(currentTotals.fat * 10) / 10}${t.grams}</td>
          </tr>
        </table>
      </div>

      <h2>${t.mealPlan}</h2>
      ${meals.map(meal => {
        const mealTotals = calculateMealTotals(meal);
        return `
          <div class="meal">
            <div class="meal-header">
              <h3>${meal.name}</h3>
              <div class="macros">
                ${Math.round(mealTotals.calories)} ${t.kcal} | 
                <span class="protein">P: ${Math.round(mealTotals.protein * 10) / 10}${t.grams}</span> | 
                <span class="carbs">C: ${Math.round(mealTotals.carbs * 10) / 10}${t.grams}</span> | 
                <span class="fat">F: ${Math.round(mealTotals.fat * 10) / 10}${t.grams}</span>
              </div>
            </div>
            <table>
              <tr>
                <th>${t.selectFood}</th>
                <th>${t.quantity}</th>
                <th>${t.calories}</th>
                <th>${t.protein}</th>
                <th>${t.carbohydrates}</th>
                <th>${t.fat}</th>
              </tr>
              ${meal.foods.map(foodEntry => {
                const food = selectedFoods[foodEntry.id];
                if (!food || !foodEntry.quantity) return '';
                
                // Convert quantity to grams for calculation
                const quantityInGrams = convertToGrams(
                  foodEntry.quantity,
                  foodEntry.unit || 'g',
                  food.servingInfo?.serving_weight_grams,
                  food.servingInfo?.serving_qty,
                  food.servingInfo?.serving_unit,
                  food.altMeasures
                );
                const macros = calculateFoodMacros(food, quantityInGrams);
                const foodName = language === 'ar' ? food.name_ar : food.name_en;
                
                return `
                  <tr ${foodEntry.isAlternative ? 'style="background-color: #fff3cd;"' : ''}>
                    <td>
                      ${foodEntry.isAlternative ? `<strong>${t.or}</strong> ` : ''}
                      <strong>${foodEntry.quantity}${foodEntry.unit || 'g'} ${foodName}</strong>
                    </td>
                    <td>${foodEntry.quantity}${foodEntry.unit || 'g'}</td>
                    <td>${macros.calories} ${t.kcal}</td>
                    <td class="protein">${macros.protein}${t.grams}</td>
                    <td class="carbs">${macros.carbs}${t.grams}</td>
                    <td class="fat">${macros.fat}${t.grams}</td>
                  </tr>
                `;
              }).join('')}
            </table>
          </div>
        `;
      }).join('')}

      ${workouts && workouts.length > 0 ? `
        <h2>${t.workoutPlan}</h2>
        ${workouts.map(dayWorkout => {
          return `
            <div class="meal">
              <div class="meal-header">
                <h3>${dayWorkout.displayName}</h3>
                ${dayWorkout.isRestDay ? `
                  <div class="macros" style="color: #F97316;">
                    ${t.restDay} - ${t.restDayDescription}
                  </div>
                ` : `
                  <div class="macros">
                    ${dayWorkout.exercises.length} ${t.exercises}
                  </div>
                `}
              </div>
              ${dayWorkout.isRestDay ? '' : `
                <table>
                  <tr>
                    <th>${t.selectExercise}</th>
                    <th>${t.sets}</th>
                    <th>${t.reps}</th>
                    <th>${t.weight} (kg)</th>
                    <th>${t.restTime} (min)</th>
                    <th>${t.videoDemo}</th>
                    <th>${t.notes}</th>
                  </tr>
                  ${dayWorkout.exercises.map(exercise => {
                    const selectedExercise = selectedExercises?.[exercise.id];
                    if (!selectedExercise || !selectedExercise.name) return '';
                    
                    // Create hyperlinked exercise name if video URL exists
                    const exerciseName = exercise.videoUrl ? 
                      `<a href="${exercise.videoUrl}" target="_blank" style="color: #3B82F6; text-decoration: underline;">${selectedExercise.name}</a> <span style="font-size: 10px; color: #6B7280;">(clickable)</span>` :
                      selectedExercise.name;
                    
                    return `
                      <tr>
                        <td>
                          <strong>${exerciseName}</strong>
                          <div style="font-size: 11px; color: #666; margin-top: 3px;">
                            ${selectedExercise.type} • ${selectedExercise.muscle} • ${selectedExercise.equipment}
                          </div>
                        </td>
                        <td>${exercise.sets}</td>
                        <td>${exercise.reps}</td>
                        <td>${exercise.weight || '-'}</td>
                        <td>${exercise.restTime || '-'}</td>
                        <td>${exercise.videoUrl ? `<a href="${exercise.videoUrl}" class="video-link" target="_blank" style="color: #3B82F6; text-decoration: underline;">Watch Demo</a>` : '-'}</td>
                        <td>${exercise.notes || '-'}</td>
                      </tr>
                    `;
                  }).join('')}
                </table>
              `}
              ${dayWorkout.notes ? `
                <div style="background-color: #F3F4F6; padding: 10px; border-radius: 4px; margin-top: 10px;">
                  <strong>${t.dayNotes}:</strong> ${dayWorkout.notes}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}

      ` : ''}

      ${notes ? `
        <div class="notes">
          <h2>${t.notes}</h2>
          <p>${notes.replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}
    </body>
    </html>
  `;

  // Open in new window for printing/saving
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Trigger print dialog
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};