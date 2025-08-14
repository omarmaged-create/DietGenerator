// Unit conversion utilities for Nutritionix units to grams

export interface UnitConversion {
  unit: string;
  gramsPerUnit: number;
  category: 'weight' | 'volume' | 'piece';
}

// Common unit conversions to grams
export const unitConversions: UnitConversion[] = [
  // Weight units
  { unit: 'g', gramsPerUnit: 1, category: 'weight' },
  { unit: 'gram', gramsPerUnit: 1, category: 'weight' },
  { unit: 'grams', gramsPerUnit: 1, category: 'weight' },
  { unit: 'kg', gramsPerUnit: 1000, category: 'weight' },
  { unit: 'kilogram', gramsPerUnit: 1000, category: 'weight' },
  { unit: 'oz', gramsPerUnit: 28.35, category: 'weight' },
  { unit: 'ounce', gramsPerUnit: 28.35, category: 'weight' },
  { unit: 'ounces', gramsPerUnit: 28.35, category: 'weight' },
  { unit: 'lb', gramsPerUnit: 453.59, category: 'weight' },
  { unit: 'lbs', gramsPerUnit: 453.59, category: 'weight' },
  { unit: 'pound', gramsPerUnit: 453.59, category: 'weight' },
  { unit: 'pounds', gramsPerUnit: 453.59, category: 'weight' },
  
  // Volume units (approximate conversions for common foods)
  { unit: 'cup', gramsPerUnit: 240, category: 'volume' },
  { unit: 'cups', gramsPerUnit: 240, category: 'volume' },
  { unit: 'tbsp', gramsPerUnit: 15, category: 'volume' },
  { unit: 'tablespoon', gramsPerUnit: 15, category: 'volume' },
  { unit: 'tablespoons', gramsPerUnit: 15, category: 'volume' },
  { unit: 'tsp', gramsPerUnit: 5, category: 'volume' },
  { unit: 'teaspoon', gramsPerUnit: 5, category: 'volume' },
  { unit: 'teaspoons', gramsPerUnit: 5, category: 'volume' },
  { unit: 'ml', gramsPerUnit: 1, category: 'volume' },
  { unit: 'milliliter', gramsPerUnit: 1, category: 'volume' },
  { unit: 'milliliters', gramsPerUnit: 1, category: 'volume' },
  { unit: 'l', gramsPerUnit: 1000, category: 'volume' },
  { unit: 'liter', gramsPerUnit: 1000, category: 'volume' },
  { unit: 'liters', gramsPerUnit: 1000, category: 'volume' },
  { unit: 'fl oz', gramsPerUnit: 30, category: 'volume' },
  { unit: 'fluid ounce', gramsPerUnit: 30, category: 'volume' },
  { unit: 'fluid ounces', gramsPerUnit: 30, category: 'volume' },
  { unit: 'pint', gramsPerUnit: 473, category: 'volume' },
  { unit: 'pints', gramsPerUnit: 473, category: 'volume' },
  { unit: 'quart', gramsPerUnit: 946, category: 'volume' },
  { unit: 'quarts', gramsPerUnit: 946, category: 'volume' },
  { unit: 'gallon', gramsPerUnit: 3785, category: 'volume' },
  { unit: 'gallons', gramsPerUnit: 3785, category: 'volume' },
  
  // Piece units (these will need to be calculated based on serving weight)
  { unit: 'piece', gramsPerUnit: 0, category: 'piece' },
  { unit: 'pieces', gramsPerUnit: 0, category: 'piece' },
  { unit: 'slice', gramsPerUnit: 0, category: 'piece' },
  { unit: 'slices', gramsPerUnit: 0, category: 'piece' },
  { unit: 'serving', gramsPerUnit: 0, category: 'piece' },
  { unit: 'servings', gramsPerUnit: 0, category: 'piece' },
  { unit: 'item', gramsPerUnit: 0, category: 'piece' },
  { unit: 'items', gramsPerUnit: 0, category: 'piece' },
  { unit: 'medium', gramsPerUnit: 0, category: 'piece' },
  { unit: 'large', gramsPerUnit: 0, category: 'piece' },
  { unit: 'small', gramsPerUnit: 0, category: 'piece' },
  { unit: 'whole', gramsPerUnit: 0, category: 'piece' },
  { unit: 'half', gramsPerUnit: 0, category: 'piece' },
  { unit: 'quarter', gramsPerUnit: 0, category: 'piece' },
  { unit: 'meatball', gramsPerUnit: 0, category: 'piece' },
  { unit: 'meatballs', gramsPerUnit: 0, category: 'piece' },
  { unit: 'nugget', gramsPerUnit: 0, category: 'piece' },
  { unit: 'nuggets', gramsPerUnit: 0, category: 'piece' },
  { unit: 'strip', gramsPerUnit: 0, category: 'piece' },
  { unit: 'strips', gramsPerUnit: 0, category: 'piece' },
  { unit: 'patty', gramsPerUnit: 0, category: 'piece' },
  { unit: 'patties', gramsPerUnit: 0, category: 'piece' },
  { unit: 'fillet', gramsPerUnit: 0, category: 'piece' },
  { unit: 'fillets', gramsPerUnit: 0, category: 'piece' },
  { unit: 'breast', gramsPerUnit: 0, category: 'piece' },
  { unit: 'thigh', gramsPerUnit: 0, category: 'piece' },
  { unit: 'wing', gramsPerUnit: 0, category: 'piece' },
  { unit: 'wings', gramsPerUnit: 0, category: 'piece' },
  { unit: 'drumstick', gramsPerUnit: 0, category: 'piece' },
  { unit: 'drumsticks', gramsPerUnit: 0, category: 'piece' },
];

export const convertToGrams = (
  quantity: number, 
  unit: string, 
  servingWeightGrams?: number,
  servingQty?: number,
  servingUnit?: string,
  altMeasures?: Array<{
    serving_weight: number;
    measure: string;
    seq: number;
    qty: number;
  }>
): number => {
  if (!quantity || quantity <= 0) return 0;
  
  // Normalize unit string
  const normalizedUnit = unit.toLowerCase().trim();
  
  // Check if this unit matches any alternative measures from Nutritionix
  if (altMeasures && altMeasures.length > 0) {
    const matchingMeasure = altMeasures.find(measure => 
      measure.measure.toLowerCase() === normalizedUnit ||
      normalizedUnit.includes(measure.measure.toLowerCase())
    );
    
    if (matchingMeasure) {
      // Convert using the alternative measure
      const gramsPerUnit = matchingMeasure.serving_weight / matchingMeasure.qty;
      return quantity * gramsPerUnit;
    }
  }
  
  // Check if this is the original serving unit
  if (servingUnit && normalizedUnit === servingUnit.toLowerCase() && servingWeightGrams && servingQty) {
    const gramsPerUnit = servingWeightGrams / servingQty;
    return quantity * gramsPerUnit;
  }
  
  // Find conversion
  const conversion = unitConversions.find(c => 
    c.unit.toLowerCase() === normalizedUnit ||
    normalizedUnit.includes(c.unit.toLowerCase())
  );
  
  if (!conversion) {
    console.warn(`Unknown unit: ${unit}, defaulting to grams`);
    return quantity; // Default to grams if unknown
  }
  
  // For piece units, use serving weight if available
  if (conversion.category === 'piece' && servingWeightGrams && servingQty) {
    const gramsPerPiece = servingWeightGrams / servingQty;
    return quantity * gramsPerPiece;
  }
  
  // For weight/volume units, use standard conversion
  if (conversion.gramsPerUnit > 0) {
    return quantity * conversion.gramsPerUnit;
  }
  
  // Fallback for piece units without serving weight
  console.warn(`Cannot convert ${unit} to grams without serving weight information`);
  return quantity; // Return as-is if we can't convert
};

export const getAvailableUnits = (servingUnit?: string): string[] => {
  const commonUnits = ['g', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'slice', 'serving'];
  
  // If we have a serving unit from Nutritionix, include it
  if (servingUnit && !commonUnits.includes(servingUnit.toLowerCase())) {
    return [servingUnit, ...commonUnits];
  }
  
  return commonUnits;
};

export const getNutritionixUnits = (
  servingUnit?: string, 
  servingWeightGrams?: number, 
  servingQty?: number,
  altMeasures?: Array<{
    serving_weight: number;
    measure: string;
    seq: number;
    qty: number;
  }>
): string[] => {
  const units = ['g', 'oz'];
  
  // Add the original Nutritionix serving unit if available
  if (servingUnit && !units.includes(servingUnit.toLowerCase())) {
    units.unshift(servingUnit);
  }
  
  // Add alternative measures from Nutritionix
  if (altMeasures && altMeasures.length > 0) {
    altMeasures.forEach(measure => {
      if (!units.includes(measure.measure.toLowerCase())) {
        units.push(measure.measure);
      }
    });
  }
  
  // Add common volume units for liquids
  if (servingUnit && (servingUnit.includes('cup') || servingUnit.includes('ml') || servingUnit.includes('fl'))) {
    units.push('cup', 'ml', 'fl oz');
  }
  
  // Add piece-based units
  if (servingUnit && (servingUnit.includes('piece') || servingUnit.includes('item') || servingUnit.includes('serving'))) {
    units.push('piece', 'serving');
  }
  
  // Remove duplicates and return
  return [...new Set(units)];
};

export const formatUnit = (unit: string): string => {
  // Capitalize first letter and handle special cases
  const formatted = unit.charAt(0).toUpperCase() + unit.slice(1);
  
  // Special formatting for common abbreviations
  const specialCases: { [key: string]: string } = {
    'G': 'g',
    'Oz': 'oz',
    'Ml': 'ml',
    'Kg': 'kg',
    'Lb': 'lb',
    'Lbs': 'lbs',
    'Tbsp': 'tbsp',
    'Tsp': 'tsp',
    'Fl oz': 'fl oz'
  };
  
  return specialCases[formatted] || formatted;
};