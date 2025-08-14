import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchFoods, getDetailedFoodInfo } from '../services/nutritionixApi';
import { searchFatSecretFoods, getDetailedFatSecretFoodInfo } from '../services/fatsecretApi';
import { selectBestFood, isAIAvailable } from '../services/googleAiService';
import { FoodItem } from '../utils/calculations';
import { translations, Language } from '../utils/translations';

interface FoodSearchProps {
  onFoodSelect: (food: FoodItem) => void;
  language: Language;
  placeholder?: string;
}

export const FoodSearch: React.FC<FoodSearchProps> = ({
  onFoodSelect,
  language,
  placeholder
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [fatSecretResults, setFatSecretResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    source: 'nutritionix' | 'fatsecret';
    index: number;
    reasoning: string;
  } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        try {
          // Search both APIs in parallel
          const [nutritionixFoods, fatSecretFoods] = await Promise.all([
            searchFoods(query),
            searchFatSecretFoods(query)
          ]);
          
          if (nutritionixFoods.length === 0 && query.trim().length >= 2) {
            // If no results and query is valid, might be due to missing credentials
            console.warn('No food results found. Check if Nutritionix API credentials are set.');
          }
          
          // Store the results separately
          setResults(nutritionixFoods);
          setFatSecretResults(fatSecretFoods || []);
          
          // Get AI suggestion if available and we have results
          if (isAIAvailable() && (nutritionixFoods.length > 0 || (fatSecretFoods && fatSecretFoods.length > 0))) {
            try {
              const suggestion = await selectBestFood(query, nutritionixFoods, fatSecretFoods || []);
              setAiSuggestion(suggestion);
            } catch (error) {
              console.error('AI suggestion error:', error);
              setAiSuggestion(null);
            }
          } else {
            setAiSuggestion(null);
          }
          
          setIsOpen(true);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
          setFatSecretResults([]);
        }
        setIsLoading(false);
      } else {
        setResults([]);
        setFatSecretResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleFoodSelect = (food: FoodItem) => {
    console.log('Food selected in FoodSearch:', food);
    onFoodSelect(food);
    setQuery('');
    setResults([]);
    setFatSecretResults([]);
    setAiSuggestion(null);
    setIsOpen(false);
  };

  const handleNutritionixFoodSelect = async (nutritionixFood: any) => {
    setIsLoading(true);
    try {
      // Get detailed nutritional information
      const detailedFood = await getDetailedFoodInfo(nutritionixFood, Date.now());
      
      // Add serving info to the food object
      detailedFood.servingInfo = {
        serving_weight_grams: nutritionixFood.serving_weight_grams,
        serving_qty: nutritionixFood.serving_qty,
        serving_unit: nutritionixFood.serving_unit
      };
      
      console.log('Detailed food selected:', detailedFood);
      handleFoodSelect(detailedFood);
    } catch (error) {
      console.error('Error getting detailed food info:', error);
    }
    setIsLoading(false);
  };

  const handleFatSecretFoodSelect = async (fatSecretFood: any) => {
    setIsLoading(true);
    try {
      // Get detailed nutritional information from FatSecret
      const detailedFood = await getDetailedFatSecretFoodInfo(fatSecretFood, Date.now() + Math.random());
      
      console.log('Detailed FatSecret food selected:', detailedFood);
      handleFoodSelect(detailedFood);
    } catch (error) {
      console.error('Error getting detailed FatSecret food info:', error);
    }
    setIsLoading(false);
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || t.selectFood}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 animate-spin" size={18} />
        )}
      </div>

      {isOpen && (results.length > 0 || fatSecretResults.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* AI Suggestion Banner */}
          {aiSuggestion && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-purple-700">AI Recommendation</span>
              </div>
              <p className="text-xs text-purple-600">{aiSuggestion.reasoning}</p>
            </div>
          )}
          
          {/* Nutritionix Results */}
          {results.map((food, index) => (
            <button
              key={index}
              onClick={() => handleNutritionixFoodSelect(food)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 focus:bg-blue-50 focus:outline-none ${
                aiSuggestion?.source === 'nutritionix' && aiSuggestion?.index === index
                  ? 'bg-purple-50 border-l-4 border-l-purple-500'
                  : ''
              }`}
              disabled={isLoading}
            >
              <div className="font-medium text-gray-900">
                {food.food_name}
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                  Nutritionix
                </span>
                {aiSuggestion?.source === 'nutritionix' && aiSuggestion?.index === index && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-medium">
                    ⭐ AI Pick
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {Math.round(food.nf_calories || 0)} {t.kcal} per {food.serving_qty} {food.serving_unit}
                {isLoading && <span className="ml-2 text-blue-600">Getting nutrition info...</span>}
              </div>
            </button>
          ))}
          
          {/* FatSecret Results */}
          {fatSecretResults.map((food, index) => (
            <button
              key={`fs-${index}`}
              onClick={() => handleFatSecretFoodSelect(food)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 focus:bg-green-50 focus:outline-none ${
                aiSuggestion?.source === 'fatsecret' && aiSuggestion?.index === index
                  ? 'bg-purple-50 border-l-4 border-l-purple-500'
                  : ''
              }`}
              disabled={isLoading}
            >
              <div className="font-medium text-gray-900">
                {food.food_name}
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                  FatSecret
                </span>
                {aiSuggestion?.source === 'fatsecret' && aiSuggestion?.index === index && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-medium">
                    ⭐ AI Pick
                  </span>
                )}
                {food.brand_name && (
                  <span className="ml-1 text-sm text-gray-500">({food.brand_name})</span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {food.food_description || 'Getting nutrition info...'}
                {isLoading && <span className="ml-2 text-green-600">Getting nutrition info...</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && fatSecretResults.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          <div>No foods found for "{query}"</div>
          <div className="text-xs mt-1 text-orange-600">
            Make sure your Nutritionix and FatSecret API credentials are entered above
            {!isAIAvailable() && (
              <div className="text-purple-600 mt-1">
                💡 Add Google AI API key for intelligent food recommendations
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};