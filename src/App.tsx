import { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Utensils, Dumbbell, Bot, Users } from 'lucide-react';
import { ClientDataForm } from './components/ClientDataForm';
import { LiveDashboard } from './components/LiveDashboard';
import { MealBuilder } from './components/MealBuilder';
import { WorkoutBuilder } from './components/WorkoutBuilder';
import { NotesSection } from './components/NotesSection';
import { PDFExport } from './components/PDFExport';
import { AIChat } from './components/AIChat';
import { LanguageToggle } from './components/LanguageToggle';
import { CredentialsSection } from './components/CredentialsSection';
import { ClientDatabaseTable } from './components/ClientDatabaseTable';
import { ClientData, calculateTDEE, FoodItem, calculateFoodMacros } from './utils/calculations';
import { convertToGrams } from './utils/unitConversions';
import { translations, Language } from './utils/translations';
import { generatePDF } from './utils/pdfGenerator';
import { SavedClient } from './services/clientDatabase';

interface Exercise {
  id: string;
  name: string;
  type: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  instructions: string;
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

function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'diet' | 'workout' | 'ai' | 'database'>('diet');
  const [clientData, setClientData] = useState<Partial<ClientData>>({});
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<DayWorkout[]>([]);
  const [notes, setNotes] = useState('');
  
  // Macro percentage targets
  const [targetProteinPercent, setTargetProteinPercent] = useState(25);
  const [targetCarbsPercent, setTargetCarbsPercent] = useState(45);
  const [targetFatPercent, setTargetFatPercent] = useState(30);
  
  // Deficit/Surplus state
  const [deficitSurplus, setDeficitSurplus] = useState(0);
  
  // Move selectedFoods state management to App level
  const [selectedFoods, setSelectedFoods] = useState<{ [key: string]: FoodItem }>({});
  const [selectedExercises, setSelectedExercises] = useState<{ [key: string]: Exercise }>({});
  
  const handleFoodSelect = (foodEntryId: string, food: FoodItem) => {
    console.log('App handleFoodSelect:', { foodEntryId, food });
    setSelectedFoods(prev => ({
      ...prev,
      [foodEntryId]: food
    }));
    
    console.log('Updated selectedFoods will be:', {
      ...selectedFoods,
      [foodEntryId]: food
    });
  };

  const handleExerciseSelect = (exerciseEntryId: string, exercise: Exercise) => {
    console.log('App handleExerciseSelect:', { exerciseEntryId, exercise });
    setSelectedExercises(prev => ({
      ...prev,
      [exerciseEntryId]: exercise
    }));
  };

  // Get current diet settings for AI context
  const getCurrentDietSettings = () => ({
    proteinPercent: targetProteinPercent,
    carbsPercent: targetCarbsPercent,
    fatPercent: targetFatPercent,
    calorieAdjustment: deficitSurplus,
    mealCount: meals.length || 4,
    dietType: 'balanced',
    restrictions: '',
    preferences: '',
    goals: 'maintenance'
  });

  // Handle loading a saved client
  const handleLoadClient = (client: SavedClient) => {
    setClientData(client.clientData);
    setMeals(client.meals);
    setSelectedFoods(client.selectedFoods);
    setNotes(client.notes);
    
    if (client.dietSettings) {
      setTargetProteinPercent(client.dietSettings.proteinPercent);
      setTargetCarbsPercent(client.dietSettings.carbsPercent);
      setTargetFatPercent(client.dietSettings.fatPercent);
      setDeficitSurplus(client.dietSettings.calorieAdjustment);
    }
    
    if (client.workouts) {
      setWorkouts(client.workouts);
    }
    
    if (client.selectedExercises) {
      setSelectedExercises(client.selectedExercises);
    }
  };
  const t = translations[language];
  const isRTL = language === 'ar';

  // Calculate target calories
  const targetCalories = clientData.height && clientData.weight && clientData.age && 
                        clientData.gender && clientData.activityMultiplier
    ? calculateTDEE(clientData as ClientData)
    : 0;

  // Calculate current totals
  const currentTotals = meals.reduce((totals, meal) => {
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
        totals.calories += macros.calories;
        totals.protein += macros.protein;
        totals.carbs += macros.carbs;
        totals.fat += macros.fat;
      }
    });
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleExportPDF = async () => {
    if ((activeTab === 'diet' || activeTab === 'ai') && meals.length === 0) {
      toast.error('Please add at least one meal before exporting');
      return;
    }
    
    if (activeTab === 'workout' && workouts.length === 0) {
      toast.error('Please add at least one workout before exporting');
      return;
    }

    try {
      await generatePDF(
        clientData, 
        meals, 
        selectedFoods, 
        notes, 
        targetCalories, 
        currentTotals, 
        language,
        activeTab === 'workout' ? workouts : undefined,
        activeTab === 'workout' ? selectedExercises : undefined,
        deficitSurplus
      );
      toast.success('PDF generated successfully!');
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error('PDF generation error:', error);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 ${isRTL ? 'rtl' : ''}`}>
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800">{t.title}</h1>
              <p className="text-sm sm:text-base text-gray-600 hidden sm:block">{t.subtitle}</p>
            </div>
            <LanguageToggle 
              currentLanguage={language} 
              onLanguageChange={setLanguage}
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-lg w-full">
            <button
              onClick={() => setActiveTab('diet')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md font-medium transition-colors justify-center text-xs sm:text-sm ${
                activeTab === 'diet'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Utensils size={16} className="sm:w-[18px] sm:h-[18px]" />
              {t.dietPlanTab}
            </button>
            <button
              onClick={() => setActiveTab('workout')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md font-medium transition-colors justify-center text-xs sm:text-sm ${
                activeTab === 'workout'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Dumbbell size={16} className="sm:w-[18px] sm:h-[18px]" />
              {t.workoutPlanTab}
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md font-medium transition-colors justify-center text-xs sm:text-sm ${
                activeTab === 'ai'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Bot size={16} className="sm:w-[18px] sm:h-[18px]" />
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md font-medium transition-colors justify-center text-xs sm:text-sm ${
                activeTab === 'database'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Client Database</span>
              <span className="sm:hidden">Database</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* API Credentials Section */}
            <CredentialsSection language={language} />

            {activeTab === 'diet' ? (
              <>
                {/* Client Data Form */}
                <ClientDataForm
                  data={clientData}
                  onChange={setClientData}
                  targetCalories={targetCalories}
                  language={language}
                />

                {/* Meal Builder */}
                <MealBuilder
                  meals={meals}
                  onMealsChange={(m: any[]) => setMeals(m as Meal[])}
                  selectedFoods={selectedFoods}
                  onFoodSelect={handleFoodSelect}
                  language={language}
                />

                {/* Notes Section */}
                <NotesSection
                  notes={notes}
                  onNotesChange={setNotes}
                  language={language}
                />
              </>
            ) : activeTab === 'workout' ? (
              <>
                {/* Workout Builder */}
                <WorkoutBuilder
                  workouts={workouts}
                  onWorkoutsChange={(w: any[]) => setWorkouts(w as DayWorkout[])}
                  selectedExercises={selectedExercises}
                  onExerciseSelect={handleExerciseSelect}
                  language={language}
                />
              </>
            ) : activeTab === 'ai' ? (
              <>
                {/* AI Chat Interface */}
                <AIChat
                  clientData={clientData}
                  meals={meals}
                  selectedFoods={selectedFoods}
                  targetCalories={targetCalories}
                  currentTotals={currentTotals}
                  onMealsChange={(m: any[]) => setMeals(m as Meal[])}
                  onSelectedFoodsChange={(newSelectedFoods: { [k: string]: any }) => {
                    console.log('AI Chat updating selectedFoods:', newSelectedFoods);
                    setSelectedFoods(newSelectedFoods as { [key: string]: FoodItem });
                  }}
                  onNotesChange={setNotes}
                  onWorkoutsChange={(w: any[]) => setWorkouts(w as DayWorkout[])}
                  onSelectedExercisesChange={(e: { [k: string]: any }) => setSelectedExercises(e as { [key: string]: Exercise })}
                  language={language}
                  targetProteinPercent={targetProteinPercent}
                  targetCarbsPercent={targetCarbsPercent}
                  targetFatPercent={targetFatPercent}
                  deficitSurplus={deficitSurplus}
                  onDeficitSurplusChange={setDeficitSurplus}
                  onTargetProteinPercentChange={setTargetProteinPercent}
                  onTargetCarbsPercentChange={setTargetCarbsPercent}
                  onTargetFatPercentChange={setTargetFatPercent}
                />
              </>
            ) : activeTab === 'database' ? (
              <>
                {/* Client Database Table */}
                <ClientDatabaseTable
                  currentClientData={clientData}
                  currentMeals={meals}
                  currentSelectedFoods={selectedFoods}
                  currentNotes={notes}
                  currentTargetCalories={targetCalories}
                  currentTotals={currentTotals}
                  currentDietSettings={getCurrentDietSettings()}
                  currentWorkouts={workouts}
                  currentSelectedExercises={selectedExercises}
                  onLoadClient={handleLoadClient}
                  language={language}
                />
              </>
            ) : null}

            {/* PDF Export */}
            <PDFExport
              onExport={handleExportPDF}
              language={language}
              disabled={
                (activeTab === 'diet' || activeTab === 'ai') ? meals.length === 0 : 
                activeTab === 'workout' ? workouts.length === 0 : 
                activeTab === 'database' ? false :
                true
              }
            />
          </div>

          {/* Sidebar - 1 column */}
          <div className="lg:col-span-1 relative z-0">
            {(activeTab === 'diet' || activeTab === 'ai' || activeTab === 'database') && (
              <LiveDashboard
                targetCalories={targetCalories}
                currentCalories={currentTotals.calories}
                currentProtein={Math.round(currentTotals.protein * 10) / 10}
                currentCarbs={Math.round(currentTotals.carbs * 10) / 10}
                currentFat={Math.round(currentTotals.fat * 10) / 10}
                language={language}
                targetProteinPercent={targetProteinPercent}
                targetCarbsPercent={targetCarbsPercent}
                targetFatPercent={targetFatPercent}
                onTargetProteinPercentChange={setTargetProteinPercent}
                onTargetCarbsPercentChange={setTargetCarbsPercent}
                onTargetFatPercentChange={setTargetFatPercent}
                deficitSurplus={deficitSurplus}
                onDeficitSurplusChange={setDeficitSurplus}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;