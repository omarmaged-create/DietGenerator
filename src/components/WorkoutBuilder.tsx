import React, { useState } from 'react';
import { Plus, Dumbbell, Calendar, Coffee, Edit2, Copy, Check, X, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { WorkoutEntry } from './WorkoutEntry';
import { translations, Language } from '../utils/translations';

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

interface WorkoutBuilderProps {
  workouts: DayWorkout[];
  onWorkoutsChange: (workouts: DayWorkout[]) => void;
  selectedExercises: { [key: string]: Exercise };
  onExerciseSelect: (exerciseEntryId: string, exercise: Exercise) => void;
  language: Language;
}

export const WorkoutBuilder: React.FC<WorkoutBuilderProps> = ({
  workouts,
  onWorkoutsChange,
  selectedExercises,
  onExerciseSelect,
  language
}) => {
  const t = translations[language];
  const isRTL = language === 'ar';
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const addWorkoutDay = () => {
    const dayNumber = workouts.length + 1;
    const newWorkout: DayWorkout = {
      id: `workout-${Date.now()}`,
      day: `day-${dayNumber}`,
      displayName: `Day ${dayNumber}`,
      isRestDay: false,
      exercises: [],
      notes: ''
    };
    onWorkoutsChange([...workouts, newWorkout]);
  };

  const deleteWorkoutDay = (dayId: string) => {
    onWorkoutsChange(workouts.filter(workout => workout.id !== dayId));
  };

  const toggleRestDay = (dayId: string) => {
    onWorkoutsChange(workouts.map(workout => 
      workout.id === dayId 
        ? { ...workout, isRestDay: !workout.isRestDay, exercises: workout.isRestDay ? workout.exercises : [] }
        : workout
    ));
  };

  const addExercise = (dayId: string) => {
    const newExercise: WorkoutExercise = {
      id: `exercise-${Date.now()}`,
      exerciseId: '',
      sets: 3,
      reps: '12',
      weight: 0,
      restTime: 2
    };
    
    onWorkoutsChange(workouts.map(workout => 
      workout.id === dayId 
        ? { ...workout, exercises: [...workout.exercises, newExercise] }
        : workout
    ));
  };

  const updateExercise = (dayId: string, exercise: WorkoutExercise) => {
    onWorkoutsChange(workouts.map(workout => 
      workout.id === dayId 
        ? { 
            ...workout, 
            exercises: workout.exercises.map(ex => ex.id === exercise.id ? exercise : ex)
          }
        : workout
    ));
  };

  const deleteExercise = (dayId: string, exerciseId: string) => {
    onWorkoutsChange(workouts.map(workout => 
      workout.id === dayId 
        ? { 
            ...workout, 
            exercises: workout.exercises.filter(ex => ex.id !== exerciseId)
          }
        : workout
    ));
  };

  const updateWorkoutNotes = (dayId: string, notes: string) => {
    onWorkoutsChange(workouts.map(workout => 
      workout.id === dayId ? { ...workout, notes } : workout
    ));
  };

  const startEditingDay = (dayId: string, currentName: string) => {
    setEditingDay(dayId);
    setEditingName(currentName);
  };

  const saveEditingDay = () => {
    if (editingDay && editingName.trim()) {
      onWorkoutsChange(workouts.map(workout => 
        workout.id === editingDay 
          ? { ...workout, displayName: editingName.trim() }
          : workout
      ));
    }
    setEditingDay(null);
    setEditingName('');
  };

  const cancelEditingDay = () => {
    setEditingDay(null);
    setEditingName('');
  };

  const duplicateWorkout = (dayId: string) => {
    const workoutToDuplicate = workouts.find(w => w.id === dayId);
    if (!workoutToDuplicate) return;

    // Create a mapping of old exercise IDs to new exercise IDs
    const exerciseIdMapping: { [oldId: string]: string } = {};
    
    // Generate new exercise IDs and create mapping
    const duplicatedExercises = workoutToDuplicate.exercises.map(exercise => {
      const newExerciseId = `exercise-${Date.now()}-${Math.random()}`;
      exerciseIdMapping[exercise.id] = newExerciseId;
      
      return {
        ...exercise,
        id: newExerciseId
      };
    });

    const newWorkout: DayWorkout = {
      ...workoutToDuplicate,
      id: `workout-${Date.now()}`,
      displayName: `${workoutToDuplicate.displayName} (Copy)`,
      exercises: duplicatedExercises
    };

    // Update workouts first
    const updatedWorkouts = [...workouts, newWorkout];
    onWorkoutsChange(updatedWorkouts);
    
    // Copy the selected exercises for the duplicated workout
    workoutToDuplicate.exercises.forEach(exercise => {
      const selectedExercise = selectedExercises[exercise.id];
      if (selectedExercise) {
        const newExerciseId = exerciseIdMapping[exercise.id];
        onExerciseSelect(newExerciseId, selectedExercise);
      }
    });
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'workout-day') {
      // Reorder workout days
      const newWorkouts = Array.from(workouts);
      const [reorderedItem] = newWorkouts.splice(source.index, 1);
      newWorkouts.splice(destination.index, 0, reorderedItem);
      onWorkoutsChange(newWorkouts);
    } else if (type === 'exercise') {
      // Reorder exercises within a day
      const dayId = source.droppableId;
      const workout = workouts.find(w => w.id === dayId);
      if (!workout) return;

      const newExercises = Array.from(workout.exercises);
      const [reorderedExercise] = newExercises.splice(source.index, 1);
      newExercises.splice(destination.index, 0, reorderedExercise);

      onWorkoutsChange(workouts.map(w => 
        w.id === dayId ? { ...w, exercises: newExercises } : w
      ));
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 ${isRTL ? 'rtl' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Dumbbell className="text-purple-600" size={20} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">{t.workoutBuilder}</h2>
        </div>
        
        <button
          onClick={addWorkoutDay}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
        >
          <Plus size={16} className="sm:w-5 sm:h-5" />
          Add Day
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="workout-days" type="workout-day">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="space-y-4 sm:space-y-6"
            >
              {workouts.map((dayWorkout, index) => (
                <Draggable key={dayWorkout.id} draggableId={dayWorkout.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50 ${
                        snapshot.isDragging ? 'shadow-lg' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
                          >
                            <Calendar className="text-purple-600" size={18} />
                          </div>
                          
                          {editingDay === dayWorkout.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="text-base sm:text-lg font-semibold bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                onKeyPress={(e) => e.key === 'Enter' && saveEditingDay()}
                                autoFocus
                              />
                              <button
                                onClick={saveEditingDay}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={cancelEditingDay}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                                {dayWorkout.displayName}
                              </h3>
                              <button
                                onClick={() => startEditingDay(dayWorkout.id, dayWorkout.displayName)}
                                className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                                title="Rename day"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-3">
                          {!dayWorkout.isRestDay && (
                            <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
                              {dayWorkout.exercises.length} {t.exercises}
                            </span>
                          )}
                          
                          <button
                            onClick={() => duplicateWorkout(dayWorkout.id)}
                            className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Duplicate workout"
                          >
                            <Copy size={14} className="sm:w-4 sm:h-4" />
                          </button>
                          
                          <button
                            onClick={() => toggleRestDay(dayWorkout.id)}
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-sm ${
                              dayWorkout.isRestDay
                                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <Coffee size={14} className="sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{dayWorkout.isRestDay ? t.restDay : t.setRestDay}</span>
                            <span className="sm:hidden">{dayWorkout.isRestDay ? 'Rest' : 'Set Rest'}</span>
                          </button>
                          
                          <button
                            onClick={() => deleteWorkoutDay(dayWorkout.id)}
                            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete day"
                          >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>

                      {dayWorkout.isRestDay ? (
                        <div className="text-center py-8 text-orange-600">
                          <Coffee size={48} className="mx-auto mb-4 text-orange-400" />
                          <p className="text-lg font-medium">{t.restDay}</p>
                          <p className="text-sm text-gray-600">{t.restDayDescription}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Droppable droppableId={dayWorkout.id} type="exercise">
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-3"
                              >
                                {dayWorkout.exercises.map((exercise, exerciseIndex) => (
                                  <Draggable key={exercise.id} draggableId={exercise.id} index={exerciseIndex}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={snapshot.isDragging ? 'shadow-lg' : ''}
                                      >
                                        <WorkoutEntry
                                          exercise={exercise}
                                          selectedExercise={selectedExercises[exercise.id]}
                                          onUpdate={(updatedExercise) => updateExercise(dayWorkout.id, updatedExercise)}
                                          onDelete={() => deleteExercise(dayWorkout.id, exercise.id)}
                                          onExerciseSelect={(selectedEx) => onExerciseSelect(exercise.id, selectedEx)}
                                          language={language}
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
                            onClick={() => addExercise(dayWorkout.id)}
                            className="flex items-center gap-2 px-3 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors w-full justify-center"
                          >
                            <Plus size={16} />
                            {t.addExercise}
                          </button>

                          {/* Day Notes */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-600 mb-2">
                              {t.dayNotes}
                            </label>
                            <textarea
                              value={dayWorkout.notes || ''}
                              onChange={(e) => updateWorkoutNotes(dayWorkout.id, e.target.value)}
                              placeholder={t.dayNotesPlaceholder}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-vertical text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {workouts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Dumbbell size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">No workout days added yet</p>
          <p className="text-sm">Click "Add Day" to start building your workout plan</p>
        </div>
      )}
    </div>
  );
};