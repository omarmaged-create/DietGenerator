import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, Save, Trash2, Eye, FileText, Users, Calendar, Target, Utensils, Dumbbell } from 'lucide-react';
import { 
  getSavedClients, 
  saveClient, 
  deleteClient, 
  loadClient, 
  exportClientsToExcel, 
  exportClientToJSON,
  importClientFromJSON,
  SavedClient 
} from '../services/clientDatabase';
import { ClientData, FoodItem } from '../utils/calculations';
import { translations, Language } from '../utils/translations';
import toast from 'react-hot-toast';

interface ClientDatabaseProps {
  currentClientData: Partial<ClientData>;
  currentMeals: any[];
  currentSelectedFoods: { [key: string]: FoodItem };
  currentNotes: string;
  currentTargetCalories: number;
  currentTotals: { calories: number; protein: number; carbs: number; fat: number };
  currentDietSettings?: any;
  currentWorkouts?: any[];
  currentSelectedExercises?: { [key: string]: any };
  onLoadClient: (client: SavedClient) => void;
  language: Language;
}

export const ClientDatabase: React.FC<ClientDatabaseProps> = ({
  currentClientData,
  currentMeals,
  currentSelectedFoods,
  currentNotes,
  currentTargetCalories,
  currentTotals,
  currentDietSettings,
  currentWorkouts,
  currentSelectedExercises,
  onLoadClient,
  language
}) => {
  const t = translations[language];
  const isRTL = language === 'ar';
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SavedClient | null>(null);
  const [showClientDetails, setShowClientDetails] = useState(false);

  // Load saved clients on component mount
  useEffect(() => {
    loadSavedClients();
  }, []);

  const loadSavedClients = () => {
    try {
      const clients = getSavedClients();
      setSavedClients(clients.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    } catch (error) {
      toast.error('Failed to load saved clients');
    }
  };

  const handleSaveCurrentClient = async () => {
    try {
      if (!currentClientData.nameEn && !currentClientData.nameAr) {
        toast.error('Please enter a client name before saving');
        return;
      }

      const clientId = saveClient(
        currentClientData,
        currentMeals,
        currentSelectedFoods,
        currentNotes,
        currentTargetCalories,
        currentTotals,
        currentDietSettings,
        currentWorkouts,
        currentSelectedExercises
      );

      loadSavedClients();
      toast.success(`Client "${currentClientData.nameEn || currentClientData.nameAr}" saved successfully!`);
    } catch (error) {
      toast.error('Failed to save client');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      deleteClient(clientId);
      loadSavedClients();
      toast.success('Client deleted successfully');
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const handleLoadClient = (client: SavedClient) => {
    onLoadClient(client);
    toast.success(`Loaded client: ${client.clientData.nameEn || client.clientData.nameAr || 'Unnamed'}`);
  };

  const handleExportAllClients = () => {
    try {
      exportClientsToExcel();
      toast.success('Clients database exported successfully!');
    } catch (error) {
      toast.error('Failed to export clients database');
    }
  };

  const handleExportClientJSON = (clientId: string) => {
    try {
      exportClientToJSON(clientId);
      toast.success('Client exported as JSON successfully!');
    } catch (error) {
      toast.error('Failed to export client JSON');
    }
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        importClientFromJSON(jsonData);
        loadSavedClients();
        toast.success('Client imported successfully!');
      } catch (error) {
        toast.error('Failed to import client. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getClientDisplayName = (client: SavedClient) => {
    return client.clientData.nameEn || client.clientData.nameAr || `Client ${client.id.slice(-8)}`;
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${isRTL ? 'rtl' : ''}`}>
      <div 
        className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Database className="text-emerald-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Client Database</h2>
            <p className="text-sm text-gray-600">
              Manage and export your client database ({savedClients.length} clients saved)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSaveCurrentClient();
            }}
            className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <Save size={16} />
            Save Current
          </button>
          <Users size={20} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100">
          <div className="space-y-4 mt-4">
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportAllClients}
                disabled={savedClients.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Download size={16} />
                Export Master Excel
              </button>
              
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer text-sm">
                <Upload size={16} />
                Import JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>

            {/* Clients List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users size={18} />
                Saved Clients ({savedClients.length})
              </h3>
              
              {savedClients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No clients saved yet</p>
                  <p className="text-sm">Save your first client to start building your database</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {savedClients.map((client) => (
                    <div key={client.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-800 truncate">
                              {getClientDisplayName(client)}
                            </h4>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {client.clientData.gender || 'N/A'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(client.timestamp)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Target size={12} />
                              {Math.round(client.targetCalories)} kcal
                            </div>
                            <div>
                              {client.meals.length} meals
                            </div>
                            <div>
                              {client.workouts?.length || 0} workouts
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                              P: {Math.round(client.currentTotals.protein)}g
                            </span>
                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              C: {Math.round(client.currentTotals.carbs)}g
                            </span>
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              F: {Math.round(client.currentTotals.fat)}g
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-3">
                          <button
                            onClick={() => {
                              setSelectedClient(client);
                              setShowClientDetails(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleLoadClient(client)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="Load Client"
                          >
                            <Upload size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleExportClientJSON(client.id)}
                            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                            title="Export JSON"
                          >
                            <FileText size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete Client"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {showClientDetails && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">
                  Client Details: {getClientDisplayName(selectedClient)}
                </h3>
                <button
                  onClick={() => setShowClientDetails(false)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Client Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">Personal Information</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Name (EN):</strong> {selectedClient.clientData.nameEn || 'N/A'}</p>
                    <p><strong>Name (AR):</strong> {selectedClient.clientData.nameAr || 'N/A'}</p>
                    <p><strong>Age:</strong> {selectedClient.clientData.age || 'N/A'} years</p>
                    <p><strong>Gender:</strong> {selectedClient.clientData.gender || 'N/A'}</p>
                    <p><strong>Height:</strong> {selectedClient.clientData.height || 'N/A'} cm</p>
                    <p><strong>Weight:</strong> {selectedClient.clientData.weight || 'N/A'} kg</p>
                    <p><strong>Activity Level:</strong> {selectedClient.clientData.activityMultiplier || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">Nutrition Summary</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Target Calories:</strong> {Math.round(selectedClient.targetCalories)} kcal</p>
                    <p><strong>Current Calories:</strong> {Math.round(selectedClient.currentTotals.calories)} kcal</p>
                    <p><strong>Protein:</strong> {Math.round(selectedClient.currentTotals.protein * 10) / 10}g</p>
                    <p><strong>Carbs:</strong> {Math.round(selectedClient.currentTotals.carbs * 10) / 10}g</p>
                    <p><strong>Fat:</strong> {Math.round(selectedClient.currentTotals.fat * 10) / 10}g</p>
                    <p><strong>Meals:</strong> {selectedClient.meals.length}</p>
                    <p><strong>Workouts:</strong> {selectedClient.workouts?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Diet Settings */}
              {selectedClient.dietSettings && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Diet Settings</h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                    <p><strong>Protein:</strong> {selectedClient.dietSettings.proteinPercent}%</p>
                    <p><strong>Carbs:</strong> {selectedClient.dietSettings.carbsPercent}%</p>
                    <p><strong>Fat:</strong> {selectedClient.dietSettings.fatPercent}%</p>
                    <p><strong>Calorie Adjustment:</strong> {selectedClient.dietSettings.calorieAdjustment > 0 ? '+' : ''}{selectedClient.dietSettings.calorieAdjustment}</p>
                    <p><strong>Diet Type:</strong> {selectedClient.dietSettings.dietType}</p>
                    <p><strong>Goals:</strong> {selectedClient.dietSettings.goals}</p>
                    {selectedClient.dietSettings.restrictions && (
                      <p><strong>Restrictions:</strong> {selectedClient.dietSettings.restrictions}</p>
                    )}
                    {selectedClient.dietSettings.preferences && (
                      <p><strong>Preferences:</strong> {selectedClient.dietSettings.preferences}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Meals */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Meal Plan ({selectedClient.meals.length} meals)</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedClient.meals.map((meal, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <h5 className="font-medium text-gray-800 mb-2">{meal.name}</h5>
                      <div className="text-sm space-y-1">
                        {meal.foods.map((food: any, foodIndex: number) => {
                          const selectedFood = selectedClient.selectedFoods[food.id];
                          return (
                            <p key={foodIndex} className="text-gray-600">
                              • {food.quantity}{food.unit || 'g'} {selectedFood?.name_en || 'Unknown food'}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedClient.notes && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Notes</h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {selectedClient.notes}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleLoadClient(selectedClient);
                    setShowClientDetails(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Upload size={16} />
                  Load Client
                </button>
                
                <button
                  onClick={() => handleExportClientJSON(selectedClient.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <FileText size={16} />
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};