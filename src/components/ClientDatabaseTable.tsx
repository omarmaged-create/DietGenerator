import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, Save, Trash2, Eye, FileText, Users, Calendar, Target, Utensils, Dumbbell, Edit, Plus, Check, X } from 'lucide-react';
import { 
  getSavedClients, 
  saveClient, 
  deleteClient, 
  updateClient,
  exportClientsToExcel, 
  exportClientToJSON,
  importClientFromJSON,
  SavedClient 
} from '../services/clientDatabase';
import { ClientData, FoodItem } from '../utils/calculations';
import { Language } from '../utils/translations';
import { generatePDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

interface ClientDatabaseTableProps {
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

export const ClientDatabaseTable: React.FC<ClientDatabaseTableProps> = ({
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
  const isRTL = language === 'ar';
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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

  saveClient(
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

  const startEditing = (clientId: string, field: string, currentValue: any) => {
    setEditingClient(clientId);
    setEditingField(field);
    setEditValue(currentValue?.toString() || '');
  };

  const saveEdit = (client: SavedClient) => {
    if (!editingField || editValue === '') return;

    try {
      const updatedClientData = { ...client.clientData };
      
      // Update the specific field
      if (editingField === 'nameEn') updatedClientData.nameEn = editValue;
      else if (editingField === 'nameAr') updatedClientData.nameAr = editValue;
      else if (editingField === 'age') updatedClientData.age = Number(editValue);
      else if (editingField === 'weight') updatedClientData.weight = Number(editValue);
      else if (editingField === 'height') updatedClientData.height = Number(editValue);
      else if (editingField === 'gender') updatedClientData.gender = editValue as 'male' | 'female';
      else if (editingField === 'activityMultiplier') updatedClientData.activityMultiplier = Number(editValue);

      updateClient(
        client.id,
        updatedClientData,
        client.meals,
        client.selectedFoods,
        client.notes,
        client.targetCalories,
        client.currentTotals,
        client.dietSettings,
        client.workouts,
        client.selectedExercises
      );

      loadSavedClients();
      toast.success('Client updated successfully');
    } catch (error) {
      toast.error('Failed to update client');
    }

    setEditingClient(null);
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingClient(null);
    setEditingField(null);
    setEditValue('');
  };

  const handleExportClientPDF = async (client: SavedClient) => {
    try {
      await generatePDF(
        client.clientData,
        client.meals,
        client.selectedFoods,
        client.notes,
        client.targetCalories,
        client.currentTotals,
        language,
        client.workouts,
        client.selectedExercises,
        client.dietSettings?.calorieAdjustment || 0
      );
      toast.success('PDF exported successfully!');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
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

  const renderEditableCell = (client: SavedClient, field: string, value: any, type: 'text' | 'number' | 'select' = 'text', options?: string[]) => {
    const isEditing = editingClient === client.id && editingField === field;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          {type === 'select' && options ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              autoFocus
            >
              {options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          )}
          <button
            onClick={() => saveEdit(client)}
            className="p-1 text-green-600 hover:bg-green-100 rounded"
          >
            <Check size={14} />
          </button>
          <button
            onClick={cancelEdit}
            className="p-1 text-red-600 hover:bg-red-100 rounded"
          >
            <X size={14} />
          </button>
        </div>
      );
    }

    return (
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
        onClick={() => startEditing(client.id, field, value)}
      >
        <span className="text-sm">{value || 'N/A'}</span>
        <Edit size={12} className="text-gray-400" />
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${isRTL ? 'rtl' : ''}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Database className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Client Database Management</h2>
              <p className="text-sm text-gray-600">
                Complete client management system ({savedClients.length} clients)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveCurrentClient}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
            >
              <Save size={16} />
              Save Current
            </button>
          </div>
        </div>
        
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {savedClients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Database size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No clients saved yet</p>
            <p className="text-sm">Save your first client to start building your database</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Info</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Physical Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nutrition Summary</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diet Settings</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Details</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {savedClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  {/* Client Info */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      <div className="font-medium text-gray-900">
                        {renderEditableCell(client, 'nameEn', client.clientData.nameEn, 'text')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {renderEditableCell(client, 'nameAr', client.clientData.nameAr, 'text')}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(client.timestamp)}
                      </div>
                    </div>
                  </td>

                  {/* Physical Data */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12">Age:</span>
                        {renderEditableCell(client, 'age', client.clientData.age, 'number')}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12">Gender:</span>
                        {renderEditableCell(client, 'gender', client.clientData.gender, 'select', ['male', 'female'])}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12">Height:</span>
                        {renderEditableCell(client, 'height', client.clientData.height ? `${client.clientData.height}cm` : '', 'number')}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12">Weight:</span>
                        {renderEditableCell(client, 'weight', client.clientData.weight ? `${client.clientData.weight}kg` : '', 'number')}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12">Activity:</span>
                        {renderEditableCell(client, 'activityMultiplier', client.clientData.activityMultiplier, 'number')}
                      </div>
                    </div>
                  </td>

                  {/* Nutrition Summary */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <Target size={12} className="text-blue-600" />
                        <span className="font-medium">{Math.round(client.targetCalories)} kcal</span>
                      </div>
                      <div className="text-gray-600">
                        Current: {Math.round(client.currentTotals.calories)} kcal
                      </div>
                      <div className="flex gap-2 text-xs">
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
                      {client.dietSettings?.calorieAdjustment !== 0 && (
                        <div className={`text-xs px-2 py-1 rounded ${
                          client.dietSettings.calorieAdjustment > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {client.dietSettings.calorieAdjustment > 0 ? '+' : ''}{client.dietSettings.calorieAdjustment} cal
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Diet Settings */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    {client.dietSettings ? (
                      <div className="space-y-1 text-xs">
                        <div>P: {client.dietSettings.proteinPercent}%</div>
                        <div>C: {client.dietSettings.carbsPercent}%</div>
                        <div>F: {client.dietSettings.fatPercent}%</div>
                        <div className="text-gray-500">{client.dietSettings.dietType}</div>
                        <div className="text-gray-500">{client.dietSettings.goals}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No settings</span>
                    )}
                  </td>

                  {/* Plan Details */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <Utensils size={12} className="text-green-600" />
                        <span>{client.meals.length} meals</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Dumbbell size={12} className="text-purple-600" />
                        <span>{client.workouts?.length || 0} workouts</span>
                      </div>
                      {client.notes && (
                        <div className="text-xs text-gray-500 truncate max-w-32" title={client.notes}>
                          📝 {client.notes.substring(0, 30)}...
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleLoadClient(client)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Load Client"
                      >
                        <Upload size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleExportClientPDF(client)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Export PDF"
                      >
                        <FileText size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleExportClientJSON(client.id)}
                        className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Export JSON"
                      >
                        <Download size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete Client"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};