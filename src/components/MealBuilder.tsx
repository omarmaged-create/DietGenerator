import React, { useState } from 'react';
import { Plus, ChefHat, Trash2, GripVertical, Edit2, Check, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FoodItem, FoodEntry as FoodEntryType, calculateFoodMacros } from '../utils/calculations';
import { convertToGrams } from '../utils/unitConversions';
import { FoodEntry } from './FoodEntry';
import { translations, Language } from '../utils/translations';

interface Meal {
  id: string;
  name: string;
  foods: FoodEntryType[];
}

interface MealBuilderProps {
  meals: Meal[];
  onMealsChange: (meals: Meal[]) => void;
  selectedFoods: { [key: string]: FoodItem };
  onFoodSelect: (foodEntryId: string, food: FoodItem) => void;
  language: Language;
}

export const MealBuilder: React.FC<MealBuilderProps> = ({
  meals,
  onMealsChange,
  selectedFoods,
  onFoodSelect,
  language
}) => {
  const t = translations[language];
  const isRTL = language === 'ar';
  const [editingMeal, setEditingMeal] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleFoodSelect = (foodEntryId: string, food: FoodItem) => {
    console.log('MealBuilder handleFoodSelect:', { foodEntryId, food });
    // Only call onFoodSelect if we have a valid food object
    if (food && food.id) {
      onFoodSelect(foodEntryId, food);
    }
  };

  const addMeal = () => {
    const mealNumber = meals.length + 1;
    const newMeal: Meal = {
      id: `meal-${Date.now()}`,
      name: `${t.meal} ${mealNumber}`,
      foods: []
    };
    onMealsChange([...meals, newMeal]);
  };

  const deleteMeal = (mealId: string) => {
    onMealsChange(meals.filter(meal => meal.id !== mealId));
  };

  const updateMealName = (mealId: string, name: string) => {
    onMealsChange(meals.map(meal => 
      meal.id === mealId ? { ...meal, name } : meal
    ));
  };

  const addFood = (mealId: string) => {
    const newFood: FoodEntryType = {
      id: `food-${Date.now()}`,
      foodId: 0,
      quantity: 0,
      unit: 'g'
    };
    
    onMealsChange(meals.map(meal => 
      meal.id === mealId 
        ? { ...meal, foods: [...meal.foods, newFood] }
        : meal
    ));
  };

  const addFoodAlternative = (mealId: string, parentFoodId: string) => {
    const newFood: FoodEntryType = {
      id: `food-${Date.now()}`,
      foodId: 0,
      quantity: 0,
      unit: 'g',
      isAlternative: true,
      parentId: parentFoodId
    };
    
    onMealsChange(meals.map(meal => {
      if (meal.id !== mealId) return meal;
      
      // Find the index of the parent food
      const parentIndex = meal.foods.findIndex(f => f.id === parentFoodId);
      if (parentIndex === -1) return meal;
      
      // Find the position to insert (after parent and any existing alternatives)
      let insertIndex = parentIndex + 1;
      while (insertIndex < meal.foods.length && meal.foods[insertIndex].parentId === parentFoodId) {
        insertIndex++;
      }
      
      // Insert the new alternative at the correct position
      const newFoods = [...meal.foods];
      newFoods.splice(insertIndex, 0, newFood);
      
      return { ...meal, foods: newFoods };
    }));
  };

  const updateFood = (mealId: string, foodEntry: FoodEntryType) => {
    onMealsChange(meals.map(meal => 
      meal.id === mealId 
        ? { 
            ...meal, 
            foods: meal.foods.map(f => f.id === foodEntry.id ? foodEntry : f)
          }
        : meal
    ));
  };

  const deleteFood = (mealId: string, foodId: string) => {
    onMealsChange(meals.map(meal => {
      if (meal.id !== mealId) return meal;
      
      // Remove the food and all its alternatives
      return {
        ...meal,
        foods: meal.foods.filter(f => f.id !== foodId && f.parentId !== foodId)
      };
    }));
  };

  const calculateMealTotals = (meal: Meal) => {
    return meal.foods.reduce((totals, foodEntry) => {
      // Skip alternatives in calculations - only count main foods
      if (foodEntry.isAlternative) {
        return totals;
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
        totals.calories += macros.calories;
        totals.protein += macros.protein;
        totals.carbs += macros.carbs;
        totals.fat += macros.fat;
      }
      return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const startEditingMeal = (mealId: string, currentName: string) => {
    setEditingMeal(mealId);
    setEditingName(currentName);
  };

  const saveEditingMeal = () => {
    if (editingMeal && editingName.trim()) {
      onMealsChange(meals.map(meal => 
        meal.id === editingMeal 
          ? { ...meal, name: editingName.trim() }
          : meal
      ));
    }
    setEditingMeal(null);
    setEditingName('');
  };

  const cancelEditingMeal = () => {
    setEditingMeal(null);
    setEditingName('');
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'meal') {
      // Reorder meals
      const newMeals = Array.from(meals);
      const [reorderedItem] = newMeals.splice(source.index, 1);
      newMeals.splice(destination.index, 0, reorderedItem);
      onMealsChange(newMeals);
    } else if (type === 'food') {
      // Reorder foods within a meal
      const mealId = source.droppableId;
      const meal = meals.find(m => m.id === mealId);
      if (!meal) return;

      const newFoods = Array.from(meal.foods);
      const [reorderedFood] = newFoods.splice(source.index, 1);
      newFoods.splice(destination.index, 0, reorderedFood);

      onMealsChange(meals.map(m => 
        m.id === mealId ? { ...m, foods: newFoods } : m
      ));
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 ${isRTL ? 'rtl' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <ChefHat className="text-purple-600" size={20} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">{t.mealBuilder}</h2>
        </div>
        
        <button
          onClick={addMeal}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
        >
          <Plus size={16} className="sm:w-5 sm:h-5" />
          {t.addMeal}
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="meals" type="meal">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="space-y-4 sm:space-y-6"
            >
              {meals.map((meal, index) => {
                const totals = calculateMealTotals(meal);
                
                return (
                  <Draggable key={meal.id} draggableId={meal.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50 ${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div 
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
                            >
                              <GripVertical size={16} className="text-gray-400" />
                            </div>
                            
                            {editingMeal === meal.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="text-base sm:text-lg font-semibold bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                                  onKeyPress={(e) => e.key === 'Enter' && saveEditingMeal()}
                                  autoFocus
                                />
                                <button
                                  onClick={saveEditingMeal}
                                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={cancelEditingMeal}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-base sm:text-lg font-semibold text-gray-800 flex-1">
                                  {meal.name}
                                </span>
                                <button
                                  onClick={() => startEditingMeal(meal.id, meal.name)}
                                  className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                                  title="Rename meal"
                                >
                                  <Edit2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-4 ml-2">
                            <div className="text-xs sm:text-sm text-gray-600 text-right">
                              <span className="font-medium">{Math.round(totals.calories)} {t.kcal}</span>
                              <div className="hidden sm:inline">
                                <span className="ml-2 text-red-600">P: {Math.round(totals.protein * 10) / 10}{t.grams}</span>
                                <span className="ml-2 text-yellow-600">C: {Math.round(totals.carbs * 10) / 10}{t.grams}</span>
                                <span className="ml-2 text-purple-600">F: {Math.round(totals.fat * 10) / 10}{t.grams}</span>
                              </div>
                              <div className="sm:hidden">
                                <div className="text-red-600">P: {Math.round(totals.protein * 10) / 10}{t.grams}</div>
                                <div className="text-yellow-600">C: {Math.round(totals.carbs * 10) / 10}{t.grams}</div>
                                <div className="text-purple-600">F: {Math.round(totals.fat * 10) / 10}{t.grams}</div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => deleteMeal(meal.id)}
                              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} className="sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>

                        <Droppable droppableId={meal.id} type="food">
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="space-y-3"
                            >
                              {meal.foods.map((foodEntry, foodIndex) => (
                                <Draggable key={foodEntry.id} draggableId={foodEntry.id} index={foodIndex}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={snapshot.isDragging ? 'shadow-lg' : ''}
                                    >
                                      <FoodEntry
                                        entry={foodEntry}
                                        selectedFood={selectedFoods[foodEntry.id]}
                                        selectedFoodServingInfo={selectedFoods[foodEntry.id]?.servingInfo}
                                        parentEntry={foodEntry.isAlternative ? meal.foods.find(f => f.id === foodEntry.parentId) : undefined}
                                        parentFood={foodEntry.isAlternative && foodEntry.parentId ? selectedFoods[foodEntry.parentId] : undefined}
                                        onUpdate={(entry) => updateFood(meal.id, entry)}
                                        onDelete={() => deleteFood(meal.id, foodEntry.id)}
                                        onAddAlternative={() => addFoodAlternative(meal.id, foodEntry.id)}
                                        onFoodSelect={(food) => handleFoodSelect(foodEntry.id, food)}
                                        language={language}
                                        isAlternative={foodEntry.isAlternative}
                                        dragHandleProps={provided.dragHandleProps}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>

                        <button
                          onClick={() => addFood(meal.id)}
                          className="flex items-center gap-2 px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Plus size={16} />
                          {t.addFood}
                        </button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {meals.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ChefHat size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">No meals added yet</p>
          <p className="text-sm">Click "Add Meal" to start building the diet plan</p>
        </div>
      )}
    </div>
  );
};