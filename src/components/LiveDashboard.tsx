import React from 'react';
import { Target, Zap, TrendingUp, Settings, Percent } from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface LiveDashboardProps {
  targetCalories: number;
  currentCalories: number;
  currentProtein: number;
  currentCarbs: number;
  currentFat: number;
  language: Language;
  targetProteinPercent?: number;
  targetCarbsPercent?: number;
  targetFatPercent?: number;
  onTargetProteinPercentChange?: (percent: number) => void;
  onTargetCarbsPercentChange?: (percent: number) => void;
  onTargetFatPercentChange?: (percent: number) => void;
  deficitSurplus?: number;
  onDeficitSurplusChange?: (value: number) => void;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  targetCalories,
  currentCalories,
  currentProtein,
  currentCarbs,
  currentFat,
  language,
  targetProteinPercent = 25,
  targetCarbsPercent = 45,
  targetFatPercent = 30,
  onTargetProteinPercentChange,
  onTargetCarbsPercentChange,
  onTargetFatPercentChange,
  deficitSurplus = 0,
  onDeficitSurplusChange
}) => {
  const t = translations[language];
  const adjustedTargetCalories = targetCalories + deficitSurplus;
  const remainingCalories = adjustedTargetCalories - currentCalories;
  const isRTL = language === 'ar';
  const [showMacroController, setShowMacroController] = React.useState(false);
  const [showDeficitController, setShowDeficitController] = React.useState(false);
  
  // Local state for input display value
  const [displayValue, setDisplayValue] = React.useState('');
  
  // Sync display value with deficitSurplus prop
  React.useEffect(() => {
    if (deficitSurplus === 0) {
      setDisplayValue('');
    } else if (deficitSurplus > 0) {
      setDisplayValue(`+${deficitSurplus}`);
    } else {
      setDisplayValue(deficitSurplus.toString());
    }
  }, [deficitSurplus]);
  
  const getRemainingColor = () => {
    const percentage = currentCalories / adjustedTargetCalories;
    if (percentage > 1.05) return 'text-red-600';
    if (percentage > 0.95) return 'text-green-600';
    return 'text-blue-600';
  };

  // Calculate current macro percentages
  const currentProteinCalories = currentProtein * 4;
  const currentCarbsCalories = currentCarbs * 4;
  const currentFatCalories = currentFat * 9;
  const totalMacroCalories = currentProteinCalories + currentCarbsCalories + currentFatCalories;
  
  const currentProteinPercent = totalMacroCalories > 0 ? Math.round((currentProteinCalories / totalMacroCalories) * 100) : 0;
  const currentCarbsPercent = totalMacroCalories > 0 ? Math.round((currentCarbsCalories / totalMacroCalories) * 100) : 0;
  const currentFatPercent = totalMacroCalories > 0 ? Math.round((currentFatCalories / totalMacroCalories) * 100) : 0;
  
  // Calculate target macro grams based on target calories and percentages
  const targetProteinCalories = adjustedTargetCalories > 0 ? Math.round(adjustedTargetCalories * (targetProteinPercent / 100)) : 0;
  const targetCarbsCalories = adjustedTargetCalories > 0 ? Math.round(adjustedTargetCalories * (targetCarbsPercent / 100)) : 0;
  const targetFatCalories = adjustedTargetCalories > 0 ? Math.round(adjustedTargetCalories * (targetFatPercent / 100)) : 0;
  
  const targetProteinGrams = Math.round((targetProteinCalories / 4) * 10) / 10;
  const targetCarbsGrams = Math.round((targetCarbsCalories / 4) * 10) / 10;
  const targetFatGrams = Math.round((targetFatCalories / 9) * 10) / 10;
  
  const handlePercentChange = (type: 'protein' | 'carbs' | 'fat', value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    
    if (type === 'protein' && onTargetProteinPercentChange) {
      onTargetProteinPercentChange(newValue);
    } else if (type === 'carbs' && onTargetCarbsPercentChange) {
      onTargetCarbsPercentChange(newValue);
    } else if (type === 'fat' && onTargetFatPercentChange) {
      onTargetFatPercentChange(newValue);
    }
  };
  
  const handleDeficitSurplusChange = (value: number) => {
    if (onDeficitSurplusChange) {
      onDeficitSurplusChange(value);
    }
  };
  
  const handleInputChange = (inputValue: string) => {
    // Always update the display value to show what user is typing
    setDisplayValue(inputValue);
    
    // Parse the input to update the actual deficit/surplus value
    if (inputValue === '' || inputValue === '+' || inputValue === '-') {
      // For empty or incomplete inputs, set to maintenance (0)
      handleDeficitSurplusChange(0);
    } else {
      // Try to parse as a number
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        handleDeficitSurplusChange(Math.round(numValue));
      }
      // If it's not a valid number, don't update deficitSurplus but keep the display value
    }
  };
  
  const getDeficitSurplusLabel = () => {
    if (deficitSurplus === 0) return 'Maintenance (0 cal)';
    if (deficitSurplus > 0) return `+${deficitSurplus} cal (Surplus)`;
    return `${deficitSurplus} cal (Deficit)`;
  };
  
  const getDeficitSurplusColor = () => {
    if (deficitSurplus === 0) return 'text-gray-600';
    if (deficitSurplus > 0) return 'text-green-600';
    return 'text-red-600';
  };

  const totalPercent = targetProteinPercent + targetCarbsPercent + targetFatPercent;
  const isValidTotal = Math.abs(totalPercent - 100) < 1; // Allow small rounding differences

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 sticky top-4 ${isRTL ? 'rtl' : ''}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <TrendingUp className="text-emerald-600" size={20} />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">{t.dashboard}</h2>
      </div>

      <div className="space-y-4">
        {/* Calories Section */}
        <div className="space-y-3">
          {/* Deficit/Surplus Controller */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Calorie Adjustment</span>
              <button
                onClick={() => setShowDeficitController(!showDeficitController)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                title="Adjust Target Calories"
              >
                <Settings size={12} />
                ±
              </button>
            </div>
            
            <div className={`font-medium ${getDeficitSurplusColor()}`}>
              {getDeficitSurplusLabel()}
            </div>
            
            {/* Mathematical Breakdown */}
            <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border">
              <div className="font-medium mb-1">TDEE Calculation:</div>
              <div>Base TDEE: {Math.round(targetCalories)} kcal</div>
              <div>Adjustment: {deficitSurplus > 0 ? '+' : ''}{deficitSurplus} kcal</div>
              <div className="font-medium text-blue-600">Target: {Math.round(adjustedTargetCalories)} kcal</div>
            </div>
            
            {showDeficitController && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Calorie Adjustment
                  </label>
                  <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Type +300 for surplus, -500 for deficit, or 0 for maintenance
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleDeficitSurplusChange(-750)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    -750
                  </button>
                  <button
                    onClick={() => handleDeficitSurplusChange(-500)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    -500
                  </button>
                  <button
                    onClick={() => handleDeficitSurplusChange(-250)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    -250
                  </button>
                  <button
                    onClick={() => handleDeficitSurplusChange(-300)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    -300
                  </button>
                  <button
                    onClick={() => handleDeficitSurplusChange(0)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handleDeficitSurplusChange(250)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    +250
                  </button>
                  <button
                    onClick={() => handleDeficitSurplusChange(300)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    +300
                  </button>
                  <button
                    onClick={() => handleDeficitSurplusChange(500)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    +500
                  </button>
                  <button
                    onClick={() => handleDeficitSurplusChange(750)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    +750
                  </button>
                </div>
                
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-gray-600" />
              <span className="font-medium text-gray-700 text-sm sm:text-base">{t.targetCalories}</span>
            </div>
            <span className="font-bold text-gray-800 text-sm sm:text-base">{Math.round(adjustedTargetCalories)} {t.kcal}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-blue-600" />
              <span className="font-medium text-gray-700 text-sm sm:text-base">{t.currentCalories}</span>
            </div>
            <span className="font-bold text-blue-600 text-sm sm:text-base">{currentCalories} {t.kcal}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
            <span className="font-medium text-gray-700 text-sm sm:text-base">{t.remainingCalories}</span>
            <span className={`font-bold text-sm sm:text-base ${getRemainingColor()}`}>
              {remainingCalories > 0 ? '+' : ''}{remainingCalories} {t.kcal}
            </span>
          </div>
        </div>

        {/* Macros Section */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm sm:text-base">Macronutrients</h3>
            <button
              onClick={() => setShowMacroController(!showMacroController)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Macro Targets"
            >
              <Settings size={12} />
              <Percent size={12} />
            </button>
          </div>
          
          {/* Macro Controller */}
          {showMacroController && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-3">
              <div className="text-xs font-medium text-gray-600 mb-2">Target Macro Percentages</div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-600 font-medium">Protein:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={targetProteinPercent}
                      onChange={(e) => handlePercentChange('protein', Number(e.target.value))}
                      min="0"
                      max="100"
                      className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-yellow-600 font-medium">Carbs:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={targetCarbsPercent}
                      onChange={(e) => handlePercentChange('carbs', Number(e.target.value))}
                      min="0"
                      max="100"
                      className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-600 font-medium">Fat:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={targetFatPercent}
                      onChange={(e) => handlePercentChange('fat', Number(e.target.value))}
                      min="0"
                      max="100"
                      className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-xs font-medium text-gray-600">Total:</span>
                <span className={`text-xs font-bold ${isValidTotal ? 'text-green-600' : 'text-red-600'}`}>
                  {totalPercent}%
                </span>
              </div>
              
              {/* Mathematical Breakdown */}
              <div className="bg-white p-2 rounded border text-xs">
                <div className="font-medium text-gray-700 mb-1">Macro Calculations:</div>
                <div className="space-y-1">
                  <div className="text-red-600">Protein: {targetProteinPercent}% × {adjustedTargetCalories} = {targetProteinCalories} kcal ÷ 4 = {targetProteinGrams}g</div>
                  <div className="text-yellow-600">Carbs: {targetCarbsPercent}% × {adjustedTargetCalories} = {targetCarbsCalories} kcal ÷ 4 = {targetCarbsGrams}g</div>
                  <div className="text-purple-600">Fat: {targetFatPercent}% × {adjustedTargetCalories} = {targetFatCalories} kcal ÷ 9 = {targetFatGrams}g</div>
                </div>
              </div>
              {!isValidTotal && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ Total should equal 100%
                </div>
              )}
            </div>
          )}
          
          {/* Current vs Target Macros */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-medium text-gray-600">{t.protein}</span>
                <span className="text-xs text-gray-500">({currentProteinPercent}%)</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-red-600 text-sm sm:text-base">{currentProtein}{t.grams}</div>
                <div className="text-xs text-gray-500">Target: {targetProteinGrams}g</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-medium text-gray-600">{t.carbohydrates}</span>
                <span className="text-xs text-gray-500">({currentCarbsPercent}%)</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-yellow-600 text-sm sm:text-base">{currentCarbs}{t.grams}</div>
                <div className="text-xs text-gray-500">Target: {targetCarbsGrams}g</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-medium text-gray-600">{t.fat}</span>
                <span className="text-xs text-gray-500">({currentFatPercent}%)</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-purple-600 text-sm sm:text-base">{currentFat}{t.grams}</div>
                <div className="text-xs text-gray-500">Target: {targetFatGrams}g</div>
              </div>
            </div>
          </div>
          
          {/* Macro Progress Bars */}
          {targetCalories > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600">Macro Progress</div>
              
              {/* Protein Progress */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Protein</span>
                  <span>{Math.round((currentProtein / targetProteinGrams) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-red-500 transition-all duration-300"
                    style={{ width: `${Math.min((currentProtein / targetProteinGrams) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Carbs Progress */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Carbs</span>
                  <span>{Math.round((currentCarbs / targetCarbsGrams) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-yellow-500 transition-all duration-300"
                    style={{ width: `${Math.min((currentCarbs / targetCarbsGrams) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Fat Progress */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Fat</span>
                  <span>{Math.round((currentFat / targetFatGrams) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${Math.min((currentFat / targetFatGrams) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {adjustedTargetCalories > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round((currentCalories / adjustedTargetCalories) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min((currentCalories / adjustedTargetCalories) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};