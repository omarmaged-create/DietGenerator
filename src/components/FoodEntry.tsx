import React from 'react';
import { X, Plus, Target, Zap, Wheat, Droplets, Sparkles, GripVertical } from 'lucide-react';
import { FoodSearch } from './FoodSearch';
import { FoodItem, FoodEntry as FoodEntryType, calculateFoodMacros, calculateAlignedQuantity, calculateMacroSimilarity } from '../utils/calculations';
import { convertToGrams, getNutritionixUnits, formatUnit } from '../utils/unitConversions';
import { translations, Language } from '../utils/translations';

interface AlignmentState {
  isAligning: boolean;
  alignmentType: 'calories' | 'protein' | 'carbs' | 'fat' | 'general' | null;
  previewQuantity: number | null;
}

interface FoodEntryProps {
  entry: FoodEntryType;
  selectedFood?: FoodItem;
  selectedFoodServingInfo?: {
    serving_weight_grams?: number;
    serving_qty?: number;
    serving_unit?: string;
  };
  parentEntry?: FoodEntryType;
  parentFood?: FoodItem;
  onUpdate: (entry: FoodEntryType) => void;
  onDelete: () => void;
  onAddAlternative: () => void;
  onFoodSelect: (food: FoodItem) => void;
  language: Language;
  isAlternative?: boolean;
  dragHandleProps?: any;
}

export const FoodEntry: React.FC<FoodEntryProps> = ({
  entry,
  selectedFood,
  selectedFoodServingInfo,
  parentEntry,
  parentFood,
  onUpdate,
  onDelete,
  onAddAlternative,
  onFoodSelect,
  language,
  isAlternative = false,
  dragHandleProps
}) => {
  const t = translations[language];
  const isRTL = language === 'ar';
  const [alignmentState, setAlignmentState] = React.useState<AlignmentState>({
    isAligning: false,
    alignmentType: null,
    previewQuantity: null
  });
  
  // Get current unit and quantity
  const currentUnit = entry.unit || 'g';
  const currentQuantity = entry.quantity || 0;
  
  // Convert current quantity to grams for macro calculations
  const quantityInGrams = convertToGrams(
    currentQuantity,
    currentUnit,
    selectedFoodServingInfo?.serving_weight_grams,
    selectedFoodServingInfo?.serving_qty,
    selectedFoodServingInfo?.serving_unit
  );
  
  // Debug logging
  console.log('FoodEntry Debug:', {
    entryId: entry.id,
    selectedFood: selectedFood,
    quantity: currentQuantity,
    unit: currentUnit,
    quantityInGrams: quantityInGrams,
    foodId: entry.foodId,
    servingInfo: selectedFoodServingInfo,
    selectedFoodDetails: selectedFood ? {
      name: selectedFood.name_en,
      calories_per_100g: selectedFood.calories_per_100g,
      protein_g_per_100g: selectedFood.protein_g_per_100g,
      carbs_g_per_100g: selectedFood.carbs_g_per_100g,
      fat_g_per_100g: selectedFood.fat_g_per_100g
    } : null
  });
  
  const macros = selectedFood && quantityInGrams > 0 ? calculateFoodMacros(selectedFood, quantityInGrams) : null;
  
  console.log('Calculated macros for entry:', entry.id, macros, {
    selectedFood: selectedFood?.name_en,
    quantity: currentQuantity,
    unit: currentUnit,
    quantityInGrams: quantityInGrams,
    foodId: entry.foodId
  });

  // Get available units for this food from Nutritionix
  const availableUnits = selectedFood ? 
    getNutritionixUnits(
      selectedFoodServingInfo?.serving_unit,
      selectedFoodServingInfo?.serving_weight_grams,
      selectedFoodServingInfo?.serving_qty,
      selectedFood.altMeasures
    ) : ['g'];
  
  const handleQuantityChange = (newQuantity: number) => {
    onUpdate({ ...entry, quantity: newQuantity });
  };
  
  const handleUnitChange = (newUnit: string) => {
    if (selectedFood && currentQuantity > 0) {
      // First convert current quantity to grams
      const currentQuantityInGrams = convertToGrams(
        currentQuantity,
        currentUnit,
        selectedFoodServingInfo?.serving_weight_grams,
        selectedFoodServingInfo?.serving_qty,
        selectedFoodServingInfo?.serving_unit,
        selectedFood.altMeasures
      );
      
      // Then convert from grams to the new unit
      const newQuantity = convertFromGrams(
        currentQuantityInGrams, 
        newUnit, 
        selectedFoodServingInfo,
        selectedFood.altMeasures
      );
      
      // Round appropriately based on unit type
      const roundedQuantity = isPieceBasedUnit(newUnit, selectedFood.altMeasures) ? 
        Math.round(newQuantity) : 
        Math.round(newQuantity * 100) / 100;
      
      onUpdate({ ...entry, unit: newUnit, quantity: roundedQuantity });
    } else {
      onUpdate({ ...entry, unit: newUnit });
    }
  };

  // Helper function to check if a unit is piece-based
  const isPieceBasedUnit = (unit: string, altMeasures?: any[]): boolean => {
    const unitLower = unit.toLowerCase();
    
    // Check common piece-based units
    const pieceUnits = ['piece', 'pieces', 'item', 'items', 'serving', 'servings', 'slice', 'slices', 
                       'egg', 'eggs', 'apple', 'apples', 'whole', 'half', 'quarter'];
    
    if (pieceUnits.some(pieceUnit => unitLower.includes(pieceUnit))) {
      return true;
    }
    
    // Check if it's in alternative measures (these are usually piece-based)
    if (altMeasures && altMeasures.some(measure => measure.measure.toLowerCase() === unitLower)) {
      return true;
    }
    
    return false;
  };

  // Helper function to convert from grams back to other units
  const convertFromGrams = (grams: number, targetUnit: string, servingInfo?: any, altMeasures?: any[]): number => {
    if (targetUnit === 'g' || targetUnit === 'gram' || targetUnit === 'grams') return grams;
    
    // Check alternative measures first
    if (altMeasures && altMeasures.length > 0) {
      const matchingMeasure = altMeasures.find(measure => 
        measure.measure.toLowerCase() === targetUnit.toLowerCase()
      );
      
      if (matchingMeasure) {
        const gramsPerUnit = matchingMeasure.serving_weight / matchingMeasure.qty;
        return grams / gramsPerUnit;
      }
    }
    
    // Handle original serving unit
    if (servingInfo && targetUnit === servingInfo.serving_unit && servingInfo.serving_weight_grams && servingInfo.serving_qty) {
      return (grams / servingInfo.serving_weight_grams) * servingInfo.serving_qty;
    }
    
    // Handle common conversions
    const conversions: { [key: string]: number } = {
      'oz': grams / 28.35,
      'ounce': grams / 28.35,
      'ounces': grams / 28.35,
      'lb': grams / 453.59,
      'lbs': grams / 453.59,
      'pound': grams / 453.59,
      'pounds': grams / 453.59,
      'cup': grams / 240,
      'cups': grams / 240,
      'tbsp': grams / 15,
      'tablespoon': grams / 15,
      'tablespoons': grams / 15,
      'tsp': grams / 5,
      'teaspoon': grams / 5,
      'teaspoons': grams / 5,
      'ml': grams,
      'milliliter': grams,
      'milliliters': grams,
      'fl oz': grams / 30,
      'fluid ounce': grams / 30,
      'fluid ounces': grams / 30
    };
    
    return conversions[targetUnit.toLowerCase()] || grams;
  };

  // Get appropriate step and placeholder based on unit
  const getQuantityProps = (unit: string) => {
    const unitLower = unit.toLowerCase();
    
    // For piece-based units
    if (isPieceBasedUnit(unit, selectedFood?.altMeasures) ||
        (selectedFoodServingInfo && unitLower === selectedFoodServingInfo.serving_unit?.toLowerCase())) {
      return { step: 1, placeholder: '1', min: 1 };
    }
    
    // For small volume units
    if (['tsp', 'teaspoon', 'teaspoons', 'tbsp', 'tablespoon', 'tablespoons'].includes(unitLower)) {
      return { step: 0.5, placeholder: '1', min: 0.1 };
    }
    
    // For cups and larger volumes
    if (['cup', 'cups'].includes(unitLower)) {
      return { step: 0.25, placeholder: '1', min: 0.1 };
    }
    
    // For weight units (grams, ounces)
    if (['g', 'gram', 'grams', 'oz', 'ounce', 'ounces'].includes(unitLower)) {
      return { step: 1, placeholder: '100', min: 1 };
    }
    
    // For pounds
    if (['lb', 'lbs', 'pound', 'pounds'].includes(unitLower)) {
      return { step: 0.1, placeholder: '0.5', min: 0.1 };
    }
    
    // Default
    return { step: 1, placeholder: '100', min: 0.1 };
  };

  const quantityProps = getQuantityProps(currentUnit);

  // For alternatives, calculate alignment and similarity
  const showAlignment = isAlternative && parentFood && parentEntry?.quantity && selectedFood;
  
  const previewAlignment = (alignmentType: 'calories' | 'protein' | 'carbs' | 'fat' | 'general') => {
    if (!parentFood || !parentEntry?.quantity || !selectedFood) return;
    
    const parentQuantityInGrams = convertToGrams(
      parentEntry.quantity,
      parentEntry.unit || 'g',
      parentFood.servingInfo?.serving_weight_grams,
      parentFood.servingInfo?.serving_qty,
      parentFood.servingInfo?.serving_unit,
      parentFood.altMeasures
    );
    
    const alignedQuantityInGrams = calculateAlignedQuantity(parentFood, parentQuantityInGrams, selectedFood, alignmentType);
    
    // Convert back to current unit if needed
    const alignedQuantity = currentUnit === 'g' ? alignedQuantityInGrams : 
      convertFromGrams(alignedQuantityInGrams, currentUnit, selectedFoodServingInfo, selectedFood.altMeasures);
    
    setAlignmentState({
      isAligning: true,
      alignmentType,
      previewQuantity: alignedQuantity
    });
  };
  
  const confirmAlignment = () => {
    if (alignmentState.previewQuantity !== null) {
      onUpdate({ ...entry, quantity: alignmentState.previewQuantity });
    }
    setAlignmentState({
      isAligning: false,
      alignmentType: null,
      previewQuantity: null
    });
  };
  
  const cancelAlignment = () => {
    setAlignmentState({
      isAligning: false,
      alignmentType: null,
      previewQuantity: null
    });
  };
  
  // Use preview quantity if in alignment mode, otherwise use current quantity
  const displayQuantity = alignmentState.isAligning && alignmentState.previewQuantity !== null ? 
    alignmentState.previewQuantity : currentQuantity;
  
  const similarity = showAlignment && quantityInGrams && parentEntry?.quantity ? 
    calculateMacroSimilarity(
      parentFood!, 
      convertToGrams(
        parentEntry.quantity,
        parentEntry.unit || 'g',
        parentFood.servingInfo?.serving_weight_grams,
        parentFood.servingInfo?.serving_qty,
        parentFood.servingInfo?.serving_unit,
        parentFood.altMeasures
      ), 
      selectedFood!, 
      quantityInGrams
    ) : null;

  return (
    <div className={`${isAlternative ? 'ml-3 sm:ml-6 border-l-2 border-orange-300 pl-2 sm:pl-4 bg-orange-50 rounded-r-lg py-2' : ''}`}>
      {isAlternative && (
        <div className="text-sm text-orange-600 font-medium mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span>{t.or}</span>
            <span className="text-xs text-gray-500 hidden sm:inline">({t.autoAlign})</span>
          </span>
          {similarity && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              similarity.similarity >= 90 ? 'bg-green-100 text-green-700' :
              similarity.similarity >= 75 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {t.similarity}: {similarity.similarity}%
            </span>
          )}
        </div>
      )}
      
      <div className={`flex flex-col sm:flex-row gap-3 items-start p-2 sm:p-3 bg-gray-50 rounded-lg ${isRTL ? 'rtl' : ''}`}>
        <div 
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded self-start"
        >
          <GripVertical size={16} className="text-gray-400" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="w-full">
            {selectedFood ? (
              <div className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-800 text-sm sm:text-base flex-1 min-w-0 pr-2">{selectedFood.name_en}</div>
                  <button
                    onClick={() => {
                      // Reset the food selection by calling onFoodSelect with null/undefined
                      // and reset the entry to initial state
                      onUpdate({ ...entry, foodId: 0, quantity: 0 });
                      // Note: We can't directly "unselect" the food from selectedFoods here
                      // as that's managed at the parent level, but resetting foodId will
                      // cause the component to show the search again
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                  >
                    Change food
                  </button>
                </div>
                <div className="text-xs text-gray-600 mb-2 flex flex-wrap gap-1">
                  {selectedFood.calories_per_100g} {t.kcal}/100g | 
                  <span className="text-red-600 ml-1">P: {selectedFood.protein_g_per_100g}g</span>
                  <span className="text-yellow-600 ml-1">C: {selectedFood.carbs_g_per_100g}g</span>
                  <span className="text-purple-600 ml-1">F: {selectedFood.fat_g_per_100g}g</span>
                </div>
                {selectedFoodServingInfo && (
                  <div className="text-xs text-blue-600 break-words">
                    <span className="font-medium">Original serving:</span> {selectedFoodServingInfo.serving_qty} {selectedFoodServingInfo.serving_unit}
                    {selectedFoodServingInfo.serving_weight_grams && (
                      <span> ({selectedFoodServingInfo.serving_weight_grams}g)</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <FoodSearch
                onFoodSelect={(food) => {
                  console.log('New food selected:', food);
                  onFoodSelect(food);
                  onUpdate({ ...entry, foodId: food.id });
                }}
                language={language}
                placeholder={t.selectFood}
              />
            )}
          </div>

          <div className="flex gap-2 sm:gap-3 items-center">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t.quantity}</label>
              <input
                type="number"
                value={displayQuantity || ''}
                onChange={(e) => {
                  if (!alignmentState.isAligning) {
                    handleQuantityChange(Number(e.target.value));
                  }
                }}
                placeholder={quantityProps.placeholder}
                step={quantityProps.step}
                min={quantityProps.min}
                className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${
                  alignmentState.isAligning 
                    ? 'border-orange-300 bg-orange-50 focus:ring-orange-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                disabled={alignmentState.isAligning}
              />
            </div>
            <div className="w-16 sm:w-20">
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <select
                value={currentUnit}
                onChange={(e) => handleUnitChange(e.target.value)}
                className={`w-full px-1 sm:px-2 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent text-xs sm:text-sm ${
                  alignmentState.isAligning 
                    ? 'border-orange-300 bg-orange-50 focus:ring-orange-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                disabled={alignmentState.isAligning}
              >
                {availableUnits.map(unit => (
                  <option key={unit} value={unit}>
                    {formatUnit(unit)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {showAlignment && (
          <div className="space-y-2 w-full sm:w-auto">
            {alignmentState.isAligning ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={confirmAlignment}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  {t.confirmAlignment}
                </button>
                <button
                  onClick={cancelAlignment}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1">
                <button
                  onClick={() => previewAlignment('general')}
                  className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-lg hover:from-purple-200 hover:to-blue-200 transition-colors font-medium"
                  title={t.generalAlign}
                >
                  <Sparkles size={12} />
                  <span className="hidden sm:inline">{t.generalAlign}</span>
                  <span className="sm:hidden">Smart</span>
                </button>
                <button
                  onClick={() => previewAlignment('calories')}
                  className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  title={t.alignByCalories}
                >
                  <Target size={12} />
                  Cal
                </button>
                <button
                  onClick={() => previewAlignment('protein')}
                  className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  title={t.alignByProtein}
                >
                  <Zap size={12} />
                  Pro
                </button>
                <button
                  onClick={() => previewAlignment('carbs')}
                  className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  title={t.alignByCarbs}
                >
                  <Wheat size={12} />
                  Carb
                </button>
                <button
                  onClick={() => previewAlignment('fat')}
                  className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors col-span-2 sm:col-span-1"
                  title={t.alignByFat}
                >
                  <Droplets size={12} />
                  Fat
                </button>
              </div>
            )}
          </div>
        )}

        <div className="w-full sm:flex-1 text-sm">
          {alignmentState.isAligning && alignmentState.previewQuantity !== null && selectedFood && (
            <div className="text-center sm:text-left">
              <div className="font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded text-xs">
                Preview Mode
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Alignment in progress...
              </div>
            </div>
          )}
        </div>
        
        {showAlignment && similarity && (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border w-full sm:w-auto">
            <div className="font-medium mb-1">{t.difference}:</div>
            <div className="space-y-1">
              <div className={`${similarity.differences.calories > 0 ? 'text-red-600' : similarity.differences.calories < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                {t.calories}: {similarity.differences.calories > 0 ? '+' : ''}{similarity.differences.calories} {t.kcal}
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs">
                <span className={`${similarity.differences.protein > 0 ? 'text-red-600' : similarity.differences.protein < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                  P: {similarity.differences.protein > 0 ? '+' : ''}{similarity.differences.protein}{t.grams}
                </span>
                <span className={`${similarity.differences.carbs > 0 ? 'text-red-600' : similarity.differences.carbs < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                  C: {similarity.differences.carbs > 0 ? '+' : ''}{similarity.differences.carbs}{t.grams}
                </span>
                <span className={`${similarity.differences.fat > 0 ? 'text-red-600' : similarity.differences.fat < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                  F: {similarity.differences.fat > 0 ? '+' : ''}{similarity.differences.fat}{t.grams}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-1 justify-end sm:justify-start">
          {!isAlternative && (
            <button
              onClick={onAddAlternative}
              className="p-1.5 sm:p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
              title={t.variation}
            >
              <Plus size={14} className="sm:w-4 sm:h-4" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            title={t.delete}
          >
            <X size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};