// Client Database Management Service
import { ClientData, FoodItem } from '../utils/calculations';

export interface SavedClient {
  id: string;
  timestamp: Date;
  clientData: Partial<ClientData>;
  meals: any[];
  selectedFoods: { [key: string]: FoodItem };
  notes: string;
  targetCalories: number;
  currentTotals: { calories: number; protein: number; carbs: number; fat: number };
  dietSettings?: {
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
    calorieAdjustment: number;
    mealCount: number;
    dietType: string;
    restrictions: string;
    preferences: string;
    goals: string;
  };
  workouts?: any[];
  selectedExercises?: { [key: string]: any };
}

const CLIENTS_STORAGE_KEY = 'saved-clients';

// Save a client to localStorage
export const saveClient = (
  clientData: Partial<ClientData>,
  meals: any[],
  selectedFoods: { [key: string]: FoodItem },
  notes: string,
  targetCalories: number,
  currentTotals: { calories: number; protein: number; carbs: number; fat: number },
  dietSettings?: any,
  workouts?: any[],
  selectedExercises?: { [key: string]: any }
): string => {
  try {
    const existingClients = getSavedClients();
    
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const savedClient: SavedClient = {
      id: clientId,
      timestamp: new Date(),
      clientData,
      meals,
      selectedFoods,
      notes,
      targetCalories,
      currentTotals,
      dietSettings,
      workouts,
      selectedExercises
    };
    
    const updatedClients = [...existingClients, savedClient];
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(updatedClients));
    
    return clientId;
  } catch (error) {
    console.error('Error saving client:', error);
    throw new Error('Failed to save client data');
  }
};

// Get all saved clients
export const getSavedClients = (): SavedClient[] => {
  try {
    const saved = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((client: any) => ({
        ...client,
        timestamp: new Date(client.timestamp)
      }));
    }
    return [];
  } catch (error) {
    console.error('Error loading saved clients:', error);
    return [];
  }
};

// Delete a saved client
export const deleteClient = (clientId: string): void => {
  try {
    const existingClients = getSavedClients();
    const updatedClients = existingClients.filter(client => client.id !== clientId);
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(updatedClients));
  } catch (error) {
    console.error('Error deleting client:', error);
    throw new Error('Failed to delete client');
  }
};

// Update an existing client
export const updateClient = (
  clientId: string,
  clientData: Partial<ClientData>,
  meals: any[],
  selectedFoods: { [key: string]: FoodItem },
  notes: string,
  targetCalories: number,
  currentTotals: { calories: number; protein: number; carbs: number; fat: number },
  dietSettings?: any,
  workouts?: any[],
  selectedExercises?: { [key: string]: any }
): void => {
  try {
    const existingClients = getSavedClients();
    const clientIndex = existingClients.findIndex(client => client.id === clientId);
    
    if (clientIndex === -1) {
      throw new Error('Client not found');
    }
    
    const updatedClient: SavedClient = {
      ...existingClients[clientIndex],
      clientData,
      meals,
      selectedFoods,
      notes,
      targetCalories,
      currentTotals,
      dietSettings,
      workouts,
      selectedExercises,
      timestamp: new Date() // Update timestamp
    };
    
    existingClients[clientIndex] = updatedClient;
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(existingClients));
  } catch (error) {
    console.error('Error updating client:', error);
    throw new Error('Failed to update client data');
  }
};

// Load a specific client
export const loadClient = (clientId: string): SavedClient | null => {
  try {
    const existingClients = getSavedClients();
    const client = existingClients.find(client => client.id === clientId);
    return client || null;
  } catch (error) {
    console.error('Error loading client:', error);
    return null;
  }
};

// Export clients to Excel format (CSV for compatibility)
export const exportClientsToExcel = (): void => {
  try {
    const clients = getSavedClients();
    
    if (clients.length === 0) {
      throw new Error('No clients to export');
    }
    
    // Create CSV headers
    const headers = [
      'Client ID',
      'Date Created',
      'Client Name (EN)',
      'Client Name (AR)',
      'Age',
      'Gender',
      'Height (cm)',
      'Weight (kg)',
      'Activity Level',
      'Target Calories',
      'Current Calories',
      'Protein (g)',
      'Carbs (g)',
      'Fat (g)',
      'Protein %',
      'Carbs %',
      'Fat %',
      'Calorie Adjustment',
      'Meal Count',
      'Diet Type',
      'Goals',
      'Restrictions',
      'Preferences',
      'Notes',
      'Meals Count',
      'Workouts Count',
      'Meal Details',
      'Workout Details'
    ];
    
    // Create CSV rows
    const rows = clients.map(client => {
      const mealDetails = client.meals.map(meal => {
        const mealFoods = meal.foods.map((food: any) => {
          const selectedFood = client.selectedFoods[food.id];
          return selectedFood ? `${food.quantity}${food.unit || 'g'} ${selectedFood.name_en}` : 'Unknown food';
        }).join('; ');
        return `${meal.name}: ${mealFoods}`;
      }).join(' | ');
      
      const workoutDetails = client.workouts ? client.workouts.map(workout => {
        if (workout.isRestDay) {
          return `${workout.displayName}: Rest Day`;
        }
        const exercises = workout.exercises.map((ex: any) => {
          const selectedExercise = client.selectedExercises?.[ex.id];
          return selectedExercise ? `${selectedExercise.name} (${ex.sets}x${ex.reps})` : 'Unknown exercise';
        }).join('; ');
        return `${workout.displayName}: ${exercises}`;
      }).join(' | ') : '';
      
      return [
        client.id,
        client.timestamp.toLocaleDateString(),
        client.clientData.nameEn || '',
        client.clientData.nameAr || '',
        client.clientData.age || '',
        client.clientData.gender || '',
        client.clientData.height || '',
        client.clientData.weight || '',
        client.clientData.activityMultiplier || '',
        client.targetCalories || '',
        client.currentTotals.calories || '',
        Math.round(client.currentTotals.protein * 10) / 10,
        Math.round(client.currentTotals.carbs * 10) / 10,
        Math.round(client.currentTotals.fat * 10) / 10,
        client.dietSettings?.proteinPercent || '',
        client.dietSettings?.carbsPercent || '',
        client.dietSettings?.fatPercent || '',
        client.dietSettings?.calorieAdjustment || '',
        client.dietSettings?.mealCount || '',
        client.dietSettings?.dietType || '',
        client.dietSettings?.goals || '',
        client.dietSettings?.restrictions || '',
        client.dietSettings?.preferences || '',
        client.notes.replace(/\n/g, ' ').replace(/,/g, ';') || '',
        client.meals.length,
        client.workouts?.length || 0,
        mealDetails.replace(/,/g, ';'),
        workoutDetails.replace(/,/g, ';')
      ];
    });
    
    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients-database-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting clients:', error);
    throw new Error('Failed to export clients data');
  }
};

// Export single client to JSON
export const exportClientToJSON = (clientId: string): void => {
  try {
    const client = loadClient(clientId);
    if (!client) {
      throw new Error('Client not found');
    }
    
    const jsonContent = JSON.stringify(client, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `client-${client.clientData.nameEn || client.id}-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting client JSON:', error);
    throw new Error('Failed to export client JSON');
  }
};

// Import client from JSON
export const importClientFromJSON = (jsonData: string): string => {
  try {
    const clientData = JSON.parse(jsonData);
    
    // Validate the imported data structure
    if (!clientData.clientData || !clientData.meals) {
      throw new Error('Invalid client data format');
    }
    
    // Generate new ID and timestamp
    const newClientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const importedClient: SavedClient = {
      ...clientData,
      id: newClientId,
      timestamp: new Date()
    };
    
    const existingClients = getSavedClients();
    const updatedClients = [...existingClients, importedClient];
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(updatedClients));
    
    return newClientId;
  } catch (error) {
    console.error('Error importing client:', error);
    throw new Error('Failed to import client data');
  }
};